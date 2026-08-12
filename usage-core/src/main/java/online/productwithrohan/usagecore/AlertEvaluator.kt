package online.productwithrohan.usagecore

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

/**
 * Fires the "you're running low" warning.
 *
 * This is the alert that can still change what you do — a reset alarm only
 * tells you you're already blocked. It's a plain notification rather than the
 * full-screen alarm for the same reason: a heads-up shouldn't hijack the phone.
 *
 * Detection is poll-based, so a warning lands on the next refresh after the
 * threshold is crossed — up to ~15 minutes late.
 */
object AlertEvaluator {

    const val CHANNEL_ID = "usage_warnings"
    private const val NOTIFICATION_BASE_ID = 7100

    fun evaluate(context: Context, snapshot: UsageSnapshot) {
        val store = Store.get(context)
        if (!store.warnEnabled) return

        val threshold = store.warnThresholdPercent
        check(context, store, threshold, ResetWindow.SESSION, snapshot.session)
        check(context, store, threshold, ResetWindow.WEEKLY, snapshot.weekly)
    }

    private fun check(
        context: Context,
        store: Store,
        threshold: Int,
        window: ResetWindow,
        usage: UsageWindow,
    ) {
        if (usage.utilization < threshold) return

        // Without a reset time there is no way to tell one window instance from
        // the next, so warning would repeat on every refresh. Skip instead.
        if (!usage.hasReset) return
        if (store.warnedResetAt(window) == usage.resetsAtEpochMillis) return

        notify(context, window, usage)
        store.setWarnedResetAt(window, usage.resetsAtEpochMillis)
    }

    private fun notify(context: Context, window: ResetWindow, usage: UsageWindow) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(context, manager)

        val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val tap = open?.let {
            PendingIntent.getActivity(
                context,
                NOTIFICATION_BASE_ID + window.requestCode,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(
                context.getString(
                    R.string.warn_notification_title,
                    context.getString(window.titleRes),
                    usage.utilization.toInt(),
                )
            )
            .setContentText(Countdown.relative(context, usage.resetsAtEpochMillis))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .apply { tap?.let { setContentIntent(it) } }
            .build()

        manager.notify(NOTIFICATION_BASE_ID + window.requestCode, notification)
    }

    private fun ensureChannel(context: Context, manager: NotificationManager) {
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.warn_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply { description = context.getString(R.string.warn_channel_description) }
        )
    }
}
