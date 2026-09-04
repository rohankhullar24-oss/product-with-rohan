package online.productwithrohan.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fires ~25s after [AutoTaskAlarmReceiver] hands a WhatsApp send off to
 * [AutoTextAccessibilityService]. Accessibility events aren't guaranteed —
 * WhatsApp's UI can change, a permission dialog can steal focus, the phone
 * can be locked — so without this a stuck send would stay PENDING forever.
 */
class AutoTaskWatchdogReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
        if (AutoTextAccessibilityService.currentPending(context) != taskId) return

        val task = AutoTaskStore.get(context, taskId) ?: return
        if (task.status != AutoTaskStatus.PENDING) return

        task.status = AutoTaskStatus.FAILED
        task.failureReason = "Couldn't find WhatsApp's Send button in time"
        task.updatedAt = System.currentTimeMillis()
        AutoTaskStore.upsert(context, task)
        AutoTextAccessibilityService.clearPending(context)
    }

    companion object {
        private const val EXTRA_TASK_ID = "watchdog_task_id"
        private const val TIMEOUT_MS = 25_000L

        private fun pendingIntent(context: Context, taskId: String): PendingIntent {
            val intent = Intent(context, AutoTaskWatchdogReceiver::class.java)
                .putExtra(EXTRA_TASK_ID, taskId)
            return PendingIntent.getBroadcast(
                context, (taskId.hashCode() and 0x7FFFFFFC) + 2, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        fun schedule(context: Context, taskId: String) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + TIMEOUT_MS, pendingIntent(context, taskId))
        }

        fun cancel(context: Context, taskId: String) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.cancel(pendingIntent(context, taskId))
        }
    }
}
