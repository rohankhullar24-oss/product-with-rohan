package online.productwithrohan.reminders

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

/** Outcome of dispatching one [AutoTask]. */
sealed class DispatchResult {
    /** Sent synchronously — the receiver marks the task DONE immediately. */
    object Success : DispatchResult()
    /** Couldn't send — the receiver marks the task FAILED with [reason]. */
    data class Failure(val reason: String) : DispatchResult()
    /**
     * Handed off to something that finishes later (WhatsApp's accessibility
     * send). The task stays PENDING; [AutoTextAccessibilityService] marks it
     * DONE when it taps Send, and [PendingActionWatchdogReceiver] marks it
     * FAILED if that never happens.
     */
    object Async : DispatchResult()
}

/**
 * Fires once per [AutoTask] at its scheduled time and sends it — SMS and
 * CALL are quick platform calls, REMINDER hands off to the existing
 * reminder-alarm stack, FAKE_CALL shows a cosmetic incoming-call screen, and
 * WHATSAPP hands off to the accessibility service. TELEGRAM/EMAIL aren't
 * wired up yet (see AutoTask.kt).
 */
class AutoTaskAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(AutoTaskAlarmScheduler.EXTRA_TASK_ID) ?: return
        // Off the main thread so sendSms's delay-between-recipients can use
        // Thread.sleep safely instead of risking an ANR.
        val pendingResult = goAsync()
        Thread {
            try {
                val task = AutoTaskStore.get(context, id) ?: return@Thread
                if (task.status != AutoTaskStatus.PENDING) return@Thread

                when (val result = dispatch(context, task)) {
                    is DispatchResult.Async -> return@Thread
                    is DispatchResult.Success -> AutoTaskFireRecorder.recordFire(context, task, true, null)
                    is DispatchResult.Failure -> AutoTaskFireRecorder.recordFire(context, task, false, result.reason)
                }
            } finally {
                pendingResult.finish()
            }
        }.start()
    }

    private fun dispatch(context: Context, task: AutoTask): DispatchResult = when (task.channel) {
        AutoTaskChannel.SMS -> sendSms(context, task)
        AutoTaskChannel.CALL -> placeCall(context, task)
        AutoTaskChannel.REMINDER -> fireReminder(context, task)
        AutoTaskChannel.WHATSAPP -> sendWhatsApp(context, task)
        AutoTaskChannel.FAKE_CALL -> showFakeCall(context, task)
        AutoTaskChannel.TELEGRAM,
        AutoTaskChannel.EMAIL -> DispatchResult.Failure("${task.channel.name} isn't supported yet")
    }

    private fun showFakeCall(context: Context, task: AutoTask): DispatchResult = try {
        context.startActivity(
            Intent(context, FakeCallActivity::class.java)
                .putExtra(FakeCallActivity.EXTRA_CALLER_NAME, task.label)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        DispatchResult.Success
    } catch (e: Exception) {
        DispatchResult.Failure(e.message ?: "Couldn't start fake call")
    }

    private fun sendSms(context: Context, task: AutoTask): DispatchResult {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return DispatchResult.Failure("SMS permission not granted")
        val numbers = task.recipient.split(",").map { it.trim() }.filter { it.isNotBlank() }
        if (numbers.isEmpty()) return DispatchResult.Failure("No recipient number")
        val delayMs = AutoSchedulerSettings.smsDelaySeconds(context) * 1000L
        val message = AutoSchedulerSettings.applySmsSignature(context, task.message)
        return try {
            // getSystemService(SmsManager::class.java) needs API 31+; minSdk here is 26.
            val smsManager = SmsManager.getDefault()
            val parts = smsManager.divideMessage(message)
            var failures = 0
            numbers.forEachIndexed { index, number ->
                if (index > 0 && delayMs > 0) Thread.sleep(delayMs)
                try {
                    smsManager.sendMultipartTextMessage(number, null, parts, null, null)
                } catch (e: Exception) {
                    failures++
                }
            }
            when {
                failures == 0 -> DispatchResult.Success
                failures == numbers.size -> DispatchResult.Failure("SMS send failed for all $failures recipients")
                else -> DispatchResult.Failure("SMS failed for $failures of ${numbers.size} recipients")
            }
        } catch (e: Exception) {
            DispatchResult.Failure(e.message ?: "SMS send failed")
        }
    }

    private fun placeCall(context: Context, task: AutoTask): DispatchResult {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE)
            != PackageManager.PERMISSION_GRANTED
        ) return DispatchResult.Failure("Call permission not granted")
        if (task.recipient.isBlank()) return DispatchResult.Failure("No recipient number")
        return try {
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:${task.recipient.trim()}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(callIntent)
            DispatchResult.Success
        } catch (e: Exception) {
            DispatchResult.Failure(e.message ?: "Call failed")
        }
    }

    /** Hands off to the existing reminder-alarm stack so it rings/notifies like any other reminder. */
    private fun fireReminder(context: Context, task: AutoTask): DispatchResult {
        val now = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
        val today = LocalDate.now().toString()
        val reminder = Reminder(
            id = task.id,
            title = task.label.ifBlank { "Reminder" },
            notes = task.message,
            type = ReminderType.ONE_TIME,
            oneTimeDate = today,
            timesOfDay = mutableListOf(now),
            nagIntervalMinutes = 0,
            alarmStyle = true,
        )
        ReminderStore.upsert(context, reminder)
        AlarmService.start(context, reminder.id, today)
        return DispatchResult.Success
    }

    /** See [WhatsAppSender] — pre-fills via wa.me, [AutoTextAccessibilityService] taps Send. */
    private fun sendWhatsApp(context: Context, task: AutoTask): DispatchResult {
        val message = AutoSchedulerSettings.applyWhatsAppSignature(context, task.message)
        return when (val result = WhatsAppSender.sendPrefilled(context, task.recipient, message, PendingActionKind.TASK, task.id)) {
            WhatsAppSender.Result.Started -> DispatchResult.Async
            WhatsAppSender.Result.WaitingForUnlock -> {
                AutoTaskLockRetryReceiver.scheduleRetry(context, task.id)
                DispatchResult.Async
            }
            WhatsAppSender.Result.AccessibilityNotEnabled -> DispatchResult.Failure("Auto Text accessibility permission not granted")
            WhatsAppSender.Result.NotInstalled -> DispatchResult.Failure("WhatsApp isn't installed")
            WhatsAppSender.Result.NoRecipient -> DispatchResult.Failure("No recipient number")
            is WhatsAppSender.Result.Error -> DispatchResult.Failure(result.message)
        }
    }
}
