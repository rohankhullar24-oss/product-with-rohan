package online.productwithrohan.usagecore

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews

/**
 * The home-screen widget: both limit windows as bars, with reset countdowns and
 * a staleness footer.
 *
 * It renders whatever the last successful fetch stored rather than fetching
 * itself — widget updates have to be quick and can arrive at any time. When the
 * session dies it collapses to a single "Tap to sign in" prompt.
 *
 * Lives in the library so either app can offer it. Tapping it opens whichever
 * app is hosting it, resolved through the launcher intent rather than a named
 * activity, since the two apps have different ones.
 */
class UsageWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val ACTION_REFRESH_SUFFIX = ".WIDGET_REFRESH"

        private fun refreshAction(context: Context) =
            context.packageName + ACTION_REFRESH_SUFFIX

        /** Repaint every placed widget from the stored snapshot. */
        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, UsageWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            if (ids.isEmpty()) return
            ids.forEach { manager.updateAppWidget(it, buildViews(context)) }
        }

        private fun buildViews(context: Context): RemoteViews {
            val store = Store.get(context)
            val views = RemoteViews(context.packageName, R.layout.widget_usage)

            val needsLogin = !store.isSignedIn || store.authState == AuthState.NEEDS_LOGIN
            val hasData = store.hasSnapshot

            openApp(context)?.let { views.setOnClickPendingIntent(R.id.widget_root, it) }
            views.setOnClickPendingIntent(R.id.widget_refresh, requestRefresh(context))

            when {
                needsLogin -> showMessage(context, views, R.string.widget_tap_to_sign_in)
                !hasData -> showMessage(context, views, R.string.widget_loading)
                else -> {
                    views.setViewVisibility(R.id.widget_message, View.GONE)
                    views.setViewVisibility(R.id.widget_content, View.VISIBLE)
                    bindWindow(
                        context, views,
                        labelId = R.id.session_label,
                        percentId = R.id.session_percent,
                        barId = R.id.session_bar,
                        resetId = R.id.session_reset,
                        label = context.getString(R.string.window_session),
                        utilization = store.sessionUtilization,
                        resetAt = store.sessionResetAt,
                    )
                    bindWindow(
                        context, views,
                        labelId = R.id.weekly_label,
                        percentId = R.id.weekly_percent,
                        barId = R.id.weekly_bar,
                        resetId = R.id.weekly_reset,
                        label = context.getString(R.string.window_weekly),
                        utilization = store.weeklyUtilization,
                        resetAt = store.weeklyResetAt,
                    )
                    views.setTextViewText(
                        R.id.widget_footer,
                        Countdown.age(context, store.fetchedAt),
                    )
                }
            }

            return views
        }

        private fun showMessage(context: Context, views: RemoteViews, messageRes: Int) {
            views.setViewVisibility(R.id.widget_content, View.GONE)
            views.setViewVisibility(R.id.widget_message, View.VISIBLE)
            views.setTextViewText(R.id.widget_message, context.getString(messageRes))
        }

        private fun bindWindow(
            context: Context,
            views: RemoteViews,
            labelId: Int,
            percentId: Int,
            barId: Int,
            resetId: Int,
            label: String,
            utilization: Float,
            resetAt: Long,
        ) {
            val percent = utilization.coerceIn(0f, 100f)
            views.setTextViewText(labelId, label)
            views.setTextViewText(
                percentId,
                context.getString(R.string.percent_used, percent.toInt()),
            )
            views.setProgressBar(barId, 100, percent.toInt(), false)

            val relative = Countdown.relative(context, resetAt)
            val absolute = Countdown.absolute(resetAt)
            views.setTextViewText(
                resetId,
                if (absolute.isBlank()) relative else "$relative · $absolute",
            )
        }

        private fun openApp(context: Context): PendingIntent? {
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                ?: return null
            return PendingIntent.getActivity(
                context,
                0,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun requestRefresh(context: Context): PendingIntent = PendingIntent.getBroadcast(
            context,
            1,
            Intent(context, UsageWidgetProvider::class.java).setAction(refreshAction(context)),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        appWidgetIds.forEach { appWidgetManager.updateAppWidget(it, buildViews(context)) }
        // The system update period is only a backstop; make sure the real
        // refresh cadence is running whenever a widget is on screen.
        RefreshScheduler.ensureScheduled(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            // Tapping the widget's refresh icon.
            refreshAction(context) -> {
                RefreshScheduler.refreshNow(context)
                refreshAll(context)
            }
            // A background refresh landed a new snapshot.
            UsageEvents.action(context) -> refreshAll(context)
        }
    }

    override fun onEnabled(context: Context) {
        RefreshScheduler.ensureScheduled(context)
    }
}
