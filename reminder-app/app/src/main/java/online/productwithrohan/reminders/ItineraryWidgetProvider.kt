package online.productwithrohan.reminders

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

/**
 * Home-screen widget: the single next upcoming stop across every trip, or a
 * prompt to plan one. Reads straight from the local JSON stores (a fast
 * synchronous file read, same data [ItineraryActivity] shows) rather than
 * keeping its own cache, so it's refreshed by calling [refreshAll] right
 * after any local write -- see [ItineraryActivity.onResume] and the two edit
 * Activities' save/delete paths.
 */
class ItineraryWidgetProvider : AppWidgetProvider() {

    companion object {
        private val dateFmt = DateTimeFormatter.ofPattern("d MMM")
        private val timeFmt = DateTimeFormatter.ofPattern("HH:mm")

        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, ItineraryWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            if (ids.isEmpty()) return
            ids.forEach { manager.updateAppWidget(it, buildViews(context)) }
        }

        private fun buildViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_itinerary)
            views.setOnClickPendingIntent(R.id.widget_itinerary_root, openApp(context))

            val next = nextStop(context)
            if (next == null) {
                views.setViewVisibility(R.id.widget_itinerary_content, View.GONE)
                views.setViewVisibility(R.id.widget_itinerary_message, View.VISIBLE)
                views.setTextViewText(R.id.widget_itinerary_message, context.getString(R.string.itinerary_widget_empty))
            } else {
                val (stop, trip) = next
                views.setViewVisibility(R.id.widget_itinerary_message, View.GONE)
                views.setViewVisibility(R.id.widget_itinerary_content, View.VISIBLE)
                views.setTextViewText(R.id.widget_itinerary_stop_title, stop.title)
                val date = LocalDate.parse(stop.date)
                val whenText = stop.time?.let { "${date.format(dateFmt)} · ${LocalTime.parse(it).format(timeFmt)}" }
                    ?: date.format(dateFmt)
                views.setTextViewText(R.id.widget_itinerary_stop_when, whenText)
                views.setTextViewText(R.id.widget_itinerary_trip_name, trip.name)
            }
            return views
        }

        /** The nearest stop today or later, across every trip, ordered by date then time. */
        private fun nextStop(context: Context): Pair<ItineraryStop, ItineraryTrip>? {
            val today = LocalDate.now().toString()
            val trips = ItineraryTripStore.getAll(context).associateBy { it.id }
            return ItineraryStopStore.getAll(context)
                .filter { it.date >= today && trips.containsKey(it.tripId) }
                .sortedWith(compareBy({ it.date }, { it.time == null }, { it.time }))
                .firstOrNull()
                ?.let { it to trips.getValue(it.tripId) }
        }

        private fun openApp(context: Context): PendingIntent {
            val launch = Intent(context, ItineraryActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            return PendingIntent.getActivity(
                context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { appWidgetManager.updateAppWidget(it, buildViews(context)) }
    }
}
