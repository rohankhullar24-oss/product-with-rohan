package online.productwithrohan.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * One exact alarm per task, kept in its own request-code space (separate
 * from [AlarmScheduler]'s reminder alarms) so the two chains never collide.
 */
object AutoTaskAlarmScheduler {

    const val EXTRA_TASK_ID = "auto_task_id"

    private fun requestCode(id: String) = id.hashCode() and 0x7FFFFFFD

    private fun pendingIntent(context: Context, taskId: String): PendingIntent {
        val intent = Intent(context, AutoTaskAlarmReceiver::class.java)
            .putExtra(EXTRA_TASK_ID, taskId)
        return PendingIntent.getBroadcast(
            context, requestCode(taskId), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun schedule(context: Context, task: AutoTask) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pendingIntent(context, task.id)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.set(AlarmManager.RTC_WAKEUP, task.scheduledAt, pi)
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, task.scheduledAt, pi)
        }
    }

    fun cancel(context: Context, taskId: String) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(pendingIntent(context, taskId))
    }

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return am.canScheduleExactAlarms()
    }
}
