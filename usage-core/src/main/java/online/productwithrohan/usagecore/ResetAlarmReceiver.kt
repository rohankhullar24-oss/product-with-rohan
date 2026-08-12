package online.productwithrohan.usagecore

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fires at a window rollover: rings, then kicks off a refresh so the widget
 * shows the reset counters and the next reset time gets armed.
 */
class ResetAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val window = ResetWindow.fromKey(intent.getStringExtra(ResetAlarmScheduler.EXTRA_WINDOW))
            ?: return

        AlarmService.start(context, window)
        RefreshScheduler.refreshNow(context)
    }
}
