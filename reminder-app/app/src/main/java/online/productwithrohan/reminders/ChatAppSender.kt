package online.productwithrohan.reminders

import android.app.KeyguardManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent

/**
 * Opens a [ChatApp] straight to a chat with a message pre-filled, via that
 * app's own deep link, then hands off to [AutoTextAccessibilityService] to
 * tap Send. Shared by [AutoTaskAlarmReceiver] (scheduled sends),
 * [AutoTaskLockRetryReceiver] (retry once unlocked) and
 * [AutoTextNotificationListenerService] (WhatsApp auto-forward) so the
 * deep-link + accessibility + watchdog hookup lives in one place.
 */
object ChatAppSender {

    sealed class Result {
        object Started : Result()
        /** Device is locked — the app can't be driven. Caller should retry once unlocked. */
        object WaitingForUnlock : Result()
        object AccessibilityNotEnabled : Result()
        object NotInstalled : Result()
        object NoRecipient : Result()
        data class Error(val message: String) : Result()
    }

    fun sendPrefilled(
        context: Context, app: ChatApp, recipient: String, message: String,
        kind: PendingActionKind, taskId: String? = null,
    ): Result {
        if (!AutoTextAccessibilityService.isEnabled(context)) return Result.AccessibilityNotEnabled
        val uri = app.buildUri(recipient, message) ?: return Result.NoRecipient
        val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (keyguard.isKeyguardLocked) return Result.WaitingForUnlock
        return try {
            val intent = Intent(Intent.ACTION_VIEW, uri)
                .setPackage(app.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            val token = when (kind) {
                PendingActionKind.TASK -> AutoTextAccessibilityService.startPendingTask(context, taskId!!)
                PendingActionKind.FORWARD -> AutoTextAccessibilityService.startPendingForward(context)
                PendingActionKind.REPLY -> error("REPLY sends type into an existing chat, not a deep link")
            }
            PendingActionWatchdogReceiver.schedule(context, token)
            Result.Started
        } catch (e: ActivityNotFoundException) {
            Result.NotInstalled
        } catch (e: Exception) {
            Result.Error(e.message ?: "Send failed")
        }
    }
}
