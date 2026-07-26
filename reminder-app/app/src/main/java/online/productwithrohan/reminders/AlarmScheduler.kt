package online.productwithrohan.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.LocalDate
import java.time.ZonedDateTime

/**
 * Two independent alarm chains per reminder, kept apart by request code:
 * the MAIN chain fires at the scheduled slots, the NAG chain re-fires an
 * unacknowledged notification every nagIntervalMinutes until Done.
 */
object AlarmScheduler {

    const val EXTRA_ID = "reminder_id"
    const val EXTRA_IS_NAG = "is_nag"
    const val EXTRA_OCCURRENCE_DAY = "occurrence_day"

    private fun mainCode(id: String) = id.hashCode() and 0x7FFFFFFE
    private fun nagCode(id: String) = (id.hashCode() and 0x7FFFFFFE) + 1

    /** (Re)schedule the next regular occurrence; cancels the main alarm if none. */
    fun scheduleNext(context: Context, reminder: Reminder) {
        val next = reminder.nextTrigger(ZonedDateTime.now())
        val pi = mainPendingIntent(context, reminder.id, next?.toLocalDate())
        if (next == null) {
            alarmManager(context).cancel(pi)
            return
        }
        setExact(context, next.toInstant().toEpochMilli(), pi)
    }

    fun scheduleNag(context: Context, reminderId: String, occurrenceDay: String, delayMinutes: Int) {
        if (delayMinutes <= 0) return
        val intent = Intent(context, AlarmReceiver::class.java)
            .putExtra(EXTRA_ID, reminderId)
            .putExtra(EXTRA_IS_NAG, true)
            .putExtra(EXTRA_OCCURRENCE_DAY, occurrenceDay)
        val pi = PendingIntent.getBroadcast(
            context, nagCode(reminderId), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        setExact(context, System.currentTimeMillis() + delayMinutes * 60_000L, pi)
    }

    fun cancelNag(context: Context, reminderId: String) {
        val intent = Intent(context, AlarmReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            context, nagCode(reminderId), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager(context).cancel(pi)
    }

    fun cancelAll(context: Context, reminderId: String) {
        alarmManager(context).cancel(mainPendingIntent(context, reminderId, null))
        cancelNag(context, reminderId)
    }

    private fun mainPendingIntent(context: Context, id: String, day: LocalDate?): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java)
            .putExtra(EXTRA_ID, id)
            .putExtra(EXTRA_IS_NAG, false)
            .putExtra(EXTRA_OCCURRENCE_DAY, day?.toString())
        return PendingIntent.getBroadcast(
            context, mainCode(id), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun canScheduleExact(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            alarmManager(context).canScheduleExactAlarms()

    private fun setExact(context: Context, triggerAtMillis: Long, pi: PendingIntent) {
        val am = alarmManager(context)
        if (canScheduleExact(context)) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        } else {
            // Without the exact-alarm permission, fire within a 10-minute window
            am.setWindow(AlarmManager.RTC_WAKEUP, triggerAtMillis, 10 * 60_000L, pi)
        }
    }

    private fun alarmManager(context: Context): AlarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
}
