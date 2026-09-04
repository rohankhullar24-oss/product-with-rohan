package online.productwithrohan.reminders

import android.Manifest
import android.content.ActivityNotFoundException
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
     * DONE when it taps Send, and [AutoTaskWatchdogReceiver] marks it FAILED
     * if that never happens.
     */
    object Async : DispatchResult()
}

/**
 * Fires once per [AutoTask] at its scheduled time and sends it — SMS and
 * CALL are quick platform calls, REMINDER hands off to the existing
 * reminder-alarm stack, and WHATSAPP hands off to the accessibility service.
 * TELEGRAM/EMAIL/FAKE_CALL aren't wired up yet (see AutoTask.kt).
 */
class AutoTaskAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(AutoTaskAlarmScheduler.EXTRA_TASK_ID) ?: return
        val task = AutoTaskStore.get(context, id) ?: return
        if (task.status != AutoTaskStatus.PENDING) return

        when (val result = dispatch(context, task)) {
            is DispatchResult.Async -> return
            is DispatchResult.Success -> {
                task.status = AutoTaskStatus.DONE
                task.failureReason = null
            }
            is DispatchResult.Failure -> {
                task.status = AutoTaskStatus.FAILED
                task.failureReason = result.reason
            }
        }
        task.updatedAt = System.currentTimeMillis()
        AutoTaskStore.upsert(context, task)
    }

    private fun dispatch(context: Context, task: AutoTask): DispatchResult = when (task.channel) {
        AutoTaskChannel.SMS -> sendSms(context, task)
        AutoTaskChannel.CALL -> placeCall(context, task)
        AutoTaskChannel.REMINDER -> fireReminder(context, task)
        AutoTaskChannel.WHATSAPP -> sendWhatsApp(context, task)
        AutoTaskChannel.TELEGRAM,
        AutoTaskChannel.EMAIL,
        AutoTaskChannel.FAKE_CALL -> DispatchResult.Failure("${task.channel.name} isn't supported yet")
    }

    private fun sendSms(context: Context, task: AutoTask): DispatchResult {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return DispatchResult.Failure("SMS permission not granted")
        val numbers = task.recipient.split(",").map { it.trim() }.filter { it.isNotBlank() }
        if (numbers.isEmpty()) return DispatchResult.Failure("No recipient number")
        return try {
            // getSystemService(SmsManager::class.java) needs API 31+; minSdk here is 26.
            val smsManager = SmsManager.getDefault()
            val parts = smsManager.divideMessage(task.message)
            var failures = 0
            for (number in numbers) {
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

    /**
     * Opens WhatsApp straight to the chat with the message pre-filled, via
     * WhatsApp's own wa.me deep link — no contact-search UI automation
     * needed. [AutoTextAccessibilityService] only has to find and tap Send.
     */
    private fun sendWhatsApp(context: Context, task: AutoTask): DispatchResult {
        if (!AutoTextAccessibilityService.isEnabled(context)) {
            return DispatchResult.Failure("Auto Text accessibility permission not granted")
        }
        val digits = task.recipient.filter { it.isDigit() || it == '+' }
        if (digits.isBlank()) return DispatchResult.Failure("No recipient number")
        return try {
            val uri = Uri.parse("https://wa.me/$digits?text=${Uri.encode(task.message)}")
            val whatsAppIntent = Intent(Intent.ACTION_VIEW, uri)
                .setPackage("com.whatsapp")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(whatsAppIntent)
            AutoTextAccessibilityService.startPending(context, task.id)
            AutoTaskWatchdogReceiver.schedule(context, task.id)
            DispatchResult.Async
        } catch (e: ActivityNotFoundException) {
            DispatchResult.Failure("WhatsApp isn't installed")
        } catch (e: Exception) {
            DispatchResult.Failure(e.message ?: "WhatsApp send failed")
        }
    }
}
