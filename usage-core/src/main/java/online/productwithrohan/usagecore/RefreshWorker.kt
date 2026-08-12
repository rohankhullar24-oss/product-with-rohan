package online.productwithrohan.usagecore

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * Pulls a fresh usage snapshot, evaluates the threshold alerts, re-arms the
 * reset alarms, and tells the host app to repaint.
 *
 * The broadcast fires on every outcome, not just success: a dead session has to
 * surface as "Tap to sign in" rather than a silently stale reading. What the app
 * does with that is its own business — the widget repaints, the Reminders
 * section re-renders — which is why this library signals rather than calling
 * into either app directly.
 */
class RefreshWorker(
    context: Context,
    parameters: WorkerParameters,
) : CoroutineWorker(context, parameters) {

    override suspend fun doWork(): Result {
        val result = UsageRepository(applicationContext).refresh()

        if (result is FetchResult.Success) {
            AlertEvaluator.evaluate(applicationContext, result.snapshot)
            if (Store.get(applicationContext).ringOnResetEnabled) {
                ResetAlarmScheduler.sync(applicationContext)
            } else {
                ResetAlarmScheduler.cancelAll(applicationContext)
            }
        }

        UsageEvents.broadcastUpdated(applicationContext)

        return when (result) {
            is FetchResult.Success -> Result.success()
            // Nothing a retry can fix; the user has to sign in again.
            FetchResult.NeedsLogin -> Result.success()
            is FetchResult.Soft -> Result.retry()
        }
    }
}
