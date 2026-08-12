package online.productwithrohan.usagecore

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** Owns the background refresh cadence. */
object RefreshScheduler {

    private const val PERIODIC_WORK = "claude-limits-periodic-refresh"
    private const val ONE_SHOT_WORK = "claude-limits-refresh-now"

    /**
     * Fifteen minutes is the shortest period WorkManager honours. It only sets
     * how fresh the numbers look — the reset alarms are exact and scheduled
     * separately, so ring timing does not depend on this.
     */
    private const val INTERVAL_MINUTES = 15L

    fun ensureScheduled(context: Context) {
        val request = PeriodicWorkRequestBuilder<RefreshWorker>(
            INTERVAL_MINUTES, TimeUnit.MINUTES,
        ).setConstraints(networkRequired()).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    /** Fetch immediately — used after sign-in, a widget tap, or a reset firing. */
    fun refreshNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<RefreshWorker>()
            .setConstraints(networkRequired())
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            ONE_SHOT_WORK,
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    fun cancelAll(context: Context) {
        WorkManager.getInstance(context).apply {
            cancelUniqueWork(PERIODIC_WORK)
            cancelUniqueWork(ONE_SHOT_WORK)
        }
    }

    private fun networkRequired() = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()
}
