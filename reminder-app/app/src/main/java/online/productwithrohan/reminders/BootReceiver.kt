package online.productwithrohan.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import online.productwithrohan.usagecore.ResetAlarmScheduler
import online.productwithrohan.usagecore.Store
import online.productwithrohan.usagecore.RefreshScheduler
import java.time.LocalDate

/**
 * Alarms don't survive a reboot (or time/zone changes), so re-arm everything.
 * A reminder that was mid-nag gets its nag chain restarted too.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        restoreClaudeAlerts(context)

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

    /**
     * The periodic usage refresh and any reset alarm are lost on reboot too.
     * Only worth restoring once Claude is actually connected.
     */
    private fun restoreClaudeAlerts(context: Context) {
        val store = Store.get(context)
        if (!store.isSignedIn) return
        RefreshScheduler.ensureScheduled(context)
        if (store.ringOnResetEnabled) ResetAlarmScheduler.sync(context)
    }
}
