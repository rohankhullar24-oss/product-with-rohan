package online.productwithrohan.claudelimits.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import online.productwithrohan.claudelimits.alarm.ResetAlarmScheduler
import online.productwithrohan.claudelimits.data.FetchResult
import online.productwithrohan.claudelimits.data.UsageRepository
import online.productwithrohan.claudelimits.widget.UsageWidgetProvider

/**
 * Pulls a fresh usage snapshot, re-arms the reset alarms from it, and repaints
 * the widget.
 *
 * The widget is updated on every outcome, not just success: a dead session has
 * to surface as "Tap to sign in" rather than a silently stale reading.
 */
class RefreshWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(context, parameters) {

    override suspend fun doWork(): Result {
        val result = UsageRepository(applicationContext).refresh()

        if (result is FetchResult.Success) {
            ResetAlarmScheduler.sync(applicationContext)
        }
        UsageWidgetProvider.refreshAll(applicationContext)

        return when (result) {
            is FetchResult.Success -> Result.success()
            // Nothing a retry can fix; the user has to sign in again.
            FetchResult.NeedsLogin -> Result.success()
            is FetchResult.Soft -> Result.retry()
        }
    }
}
