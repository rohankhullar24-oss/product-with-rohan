package online.productwithrohan.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.time.LocalDate

class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_DONE = "online.productwithrohan.reminders.DONE"
        const val ACTION_SNOOZE = "online.productwithrohan.reminders.SNOOZE"
        const val SNOOZE_MINUTES = 60
    }

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
        val occurrenceDay = intent.getStringExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY)
            ?: LocalDate.now().toString()
        val reminder = ReminderStore.get(context, id) ?: return

        when (intent.action) {
            ACTION_DONE -> {
                AlarmService.stop(context)
                NotificationHelper.cancel(context, id)
                AlarmScheduler.cancelNag(context, id)
                reminder.activeNagDay = null
                reminder.updatedAt = System.currentTimeMillis()
                if (reminder.type == ReminderType.ONE_TIME) {
                    reminder.completed = true
                    ReminderStore.upsert(context, reminder)
                    AlarmScheduler.cancelAll(context, id)
                } else {
                    // Confirming Done silences the rest of this day's slots too.
                    reminder.doneForDay = occurrenceDay
                    ReminderStore.upsert(context, reminder)
                    AlarmScheduler.scheduleNext(context, reminder)
                }
                SyncManager.syncAsync(context)
            }
            ACTION_SNOOZE -> {
                AlarmService.stop(context)
                NotificationHelper.cancel(context, id)
                AlarmScheduler.cancelNag(context, id)
                AlarmScheduler.scheduleNag(context, id, occurrenceDay, SNOOZE_MINUTES)
            }
        }
    }
}
