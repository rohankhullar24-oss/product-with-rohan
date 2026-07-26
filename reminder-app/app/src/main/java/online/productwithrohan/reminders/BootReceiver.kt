package online.productwithrohan.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.time.LocalDate

/**
 * Alarms don't survive a reboot (or time/zone changes), so re-arm everything.
 * A reminder that was mid-nag gets its nag chain restarted too.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val today = LocalDate.now().toString()
        for (reminder in ReminderStore.getAll(context)) {
            if (!reminder.enabled || reminder.completed) continue
            AlarmScheduler.scheduleNext(context, reminder)
            val nagDay = reminder.activeNagDay
            if (nagDay != null && reminder.doneForDay != nagDay &&
                (nagDay == today || reminder.type == ReminderType.ONE_TIME)
            ) {
                // Re-fire shortly after boot rather than waiting a full interval.
                AlarmScheduler.scheduleNag(context, reminder.id, nagDay, 2)
            }
        }
    }
}
