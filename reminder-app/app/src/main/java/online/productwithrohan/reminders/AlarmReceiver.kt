package online.productwithrohan.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.time.LocalDate

/**
 * Fires for both the regular occurrence alarm and the nag re-alarm.
 *
 * Regular fire: notify, remember we're nagging for this day, arm the first nag,
 * and chain the next regular occurrence.
 * Nag fire: if the occurrence still isn't confirmed Done, re-notify and re-arm.
 * Nags for a recurring reminder stop when its day has passed (the next regular
 * occurrence takes over); a ONE_TIME reminder keeps nagging until Done.
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
        val isNag = intent.getBooleanExtra(AlarmScheduler.EXTRA_IS_NAG, false)
        val reminder = ReminderStore.get(context, id) ?: return
        if (!reminder.enabled || reminder.completed) return

        val today = LocalDate.now().toString()
        val occurrenceDay = intent.getStringExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY) ?: today

        if (isNag) {
            if (reminder.doneForDay == occurrenceDay) return
            if (occurrenceDay != today && reminder.type != ReminderType.ONE_TIME) {
                reminder.activeNagDay = null
                ReminderStore.upsert(context, reminder)
                return
            }
            NotificationHelper.show(context, reminder, occurrenceDay)
            AlarmScheduler.scheduleNag(context, id, occurrenceDay, reminder.nagIntervalMinutes)
        } else {
            if (reminder.doneForDay == occurrenceDay) {
                AlarmScheduler.scheduleNext(context, reminder)
                return
            }
            NotificationHelper.show(context, reminder, occurrenceDay)
            reminder.activeNagDay = occurrenceDay
            ReminderStore.upsert(context, reminder)
            AlarmScheduler.scheduleNag(context, id, occurrenceDay, reminder.nagIntervalMinutes)
            AlarmScheduler.scheduleNext(context, reminder)
        }
    }
}
