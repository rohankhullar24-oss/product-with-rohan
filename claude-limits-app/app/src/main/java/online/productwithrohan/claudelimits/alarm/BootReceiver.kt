package online.productwithrohan.claudelimits.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import online.productwithrohan.usagecore.UsageWidgetProvider
import online.productwithrohan.usagecore.RefreshScheduler
import online.productwithrohan.usagecore.ResetAlarmScheduler

/**
 * Alarms and periodic work do not survive a reboot, a package replacement, or a
 * clock change, so both are re-established here. The stored reset timestamps are
 * absolute, so re-arming from them stays correct across a timezone change.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        ResetAlarmScheduler.sync(context)
        RefreshScheduler.ensureScheduled(context)
        UsageWidgetProvider.refreshAll(context)
    }
}
