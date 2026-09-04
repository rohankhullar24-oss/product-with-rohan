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

/**
 * Fires once per [AutoTask] at its scheduled time and sends it directly —
 * SMS and CALL are quick platform calls, and REMINDER just hands off to the
 * existing reminder-alarm stack, so none of this needs a foreground service.
 * WHATSAPP/TELEGRAM/EMAIL/FAKE_CALL aren't wired up yet (see AutoTask.kt).
 */
class AutoTaskAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(AutoTaskAlarmScheduler.EXTRA_TASK_ID) ?: return
        val task = AutoTaskStore.get(context, id) ?: return
        if (task.status != AutoTaskStatus.PENDING) return

        val result = dispatch(context, task)
        task.status = if (result == null) AutoTaskStatus.DONE else AutoTaskStatus.FAILED
        task.failureReason = result
        task.updatedAt = System.currentTimeMillis()
        AutoTaskStore.upsert(context, task)
    }

    /** Returns null on success, or a human-readable failure reason. */
    private fun dispatch(context: Context, task: AutoTask): String? = when (task.channel) {
        AutoTaskChannel.SMS -> sendSms(context, task)
        AutoTaskChannel.CALL -> placeCall(context, task)
        AutoTaskChannel.REMINDER -> fireReminder(context, task)
        AutoTaskChannel.WHATSAPP,
        AutoTaskChannel.TELEGRAM,
        AutoTaskChannel.EMAIL,
        AutoTaskChannel.FAKE_CALL -> "${task.channel.name} isn't supported yet"
    }

    private fun sendSms(context: Context, task: AutoTask): String? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return "SMS permission not granted"
        if (task.recipient.isBlank()) return "No recipient number"
        return try {
            // getSystemService(SmsManager::class.java) needs API 31+; minSdk here is 26.
            val smsManager = SmsManager.getDefault()
            val parts = smsManager.divideMessage(task.message)
            smsManager.sendMultipartTextMessage(task.recipient.trim(), null, parts, null, null)
            null
        } catch (e: Exception) {
            e.message ?: "SMS send failed"
        }
    }

    private fun placeCall(context: Context, task: AutoTask): String? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE)
            != PackageManager.PERMISSION_GRANTED
        ) return "Call permission not granted"
        if (task.recipient.isBlank()) return "No recipient number"
        return try {
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:${task.recipient.trim()}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(callIntent)
            null
        } catch (e: Exception) {
            e.message ?: "Call failed"
        }
    }

    /** Hands off to the existing reminder-alarm stack so it rings/notifies like any other reminder. */
    private fun fireReminder(context: Context, task: AutoTask): String? {
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
        return null
    }
}
