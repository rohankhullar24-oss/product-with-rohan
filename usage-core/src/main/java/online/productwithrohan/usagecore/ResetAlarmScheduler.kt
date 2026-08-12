package online.productwithrohan.usagecore

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Arms one exact alarm per limit window.
 *
 * The reset times come straight from the API rather than from a local clock, so
 * the ring lands on the real rollover even though the usage snapshot itself only
 * refreshes every 15 minutes.
 */
object ResetAlarmScheduler {

    const val EXTRA_WINDOW = "window"

    /** Ignore a reset that is already behind us, or so close it has effectively passed. */
    private const val MIN_LEAD_MS = 5_000L

    /** Re-arm both alarms from the stored snapshot. Safe to call repeatedly. */
    fun sync(context: Context, store: Store = Store.get(context)) {
        schedule(context, ResetWindow.SESSION, store.sessionResetAt)
        schedule(context, ResetWindow.WEEKLY, store.weeklyResetAt)
    }

    fun schedule(context: Context, window: ResetWindow, triggerAtMillis: Long) {
        val pendingIntent = pendingIntent(context, window)
        if (triggerAtMillis <= System.currentTimeMillis() + MIN_LEAD_MS) {
            alarmManager(context).cancel(pendingIntent)
            return
        }
        setExact(context, triggerAtMillis, pendingIntent)
    }

    fun cancelAll(context: Context) {
        val manager = alarmManager(context)
        ResetWindow.entries.forEach { manager.cancel(pendingIntent(context, it)) }
    }

    fun canScheduleExact(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            alarmManager(context).canScheduleExactAlarms()

    private fun pendingIntent(context: Context, window: ResetWindow): PendingIntent {
        val intent = Intent(context, ResetAlarmReceiver::class.java)
            .putExtra(EXTRA_WINDOW, window.key)
        return PendingIntent.getBroadcast(
            context,
            window.requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun setExact(context: Context, triggerAtMillis: Long, pendingIntent: PendingIntent) {
        val manager = alarmManager(context)
        if (canScheduleExact(context)) {
            manager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent,
            )
        } else {
            // Without the exact-alarm permission, land inside a 10-minute window.
            manager.setWindow(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                10 * 60_000L,
                pendingIntent,
            )
        }
    }

    private fun alarmManager(context: Context): AlarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
}
