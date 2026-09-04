package online.productwithrohan.reminders

import android.app.KeyguardManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Opens WhatsApp straight to a chat with a message pre-filled, via WhatsApp's
 * own wa.me deep link, then hands off to [AutoTextAccessibilityService] to
 * tap Send. Shared by [AutoTaskAlarmReceiver] (scheduled sends) and
 * [AutoTextNotificationListenerService] (auto-forward) so the wa.me +
 * accessibility + watchdog hookup lives in one place.
 */
object WhatsAppSender {

    sealed class Result {
        object Started : Result()
        /** Device is locked — WhatsApp can't be driven. Caller should retry once unlocked. */
        object WaitingForUnlock : Result()
        object AccessibilityNotEnabled : Result()
        object NotInstalled : Result()
        object NoRecipient : Result()
        data class Error(val message: String) : Result()
    }

    fun sendPrefilled(
        context: Context, recipient: String, message: String,
        kind: PendingActionKind, taskId: String? = null,
    ): Result {
        if (!AutoTextAccessibilityService.isEnabled(context)) return Result.AccessibilityNotEnabled
        val digits = recipient.filter { it.isDigit() || it == '+' }
        if (digits.isBlank()) return Result.NoRecipient
        val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (keyguard.isKeyguardLocked) return Result.WaitingForUnlock
        return try {
            val uri = Uri.parse("https://wa.me/$digits?text=${Uri.encode(message)}")
            val intent = Intent(Intent.ACTION_VIEW, uri)
                .setPackage("com.whatsapp")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            val token = when (kind) {
                PendingActionKind.TASK -> AutoTextAccessibilityService.startPendingTask(context, taskId!!)
                PendingActionKind.FORWARD -> AutoTextAccessibilityService.startPendingForward(context)
                PendingActionKind.REPLY -> error("REPLY sends type into an existing chat, not a wa.me link")
            }
            PendingActionWatchdogReceiver.schedule(context, token)
            Result.Started
        } catch (e: ActivityNotFoundException) {
            Result.NotInstalled
        } catch (e: Exception) {
            Result.Error(e.message ?: "WhatsApp send failed")
        }
    }
}
