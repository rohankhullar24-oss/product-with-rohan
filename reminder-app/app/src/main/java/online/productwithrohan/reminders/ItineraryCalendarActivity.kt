package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.CalendarView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.time.LocalDate
import java.time.ZoneId

/**
 * Day-by-day view of one trip: pick a date on the calendar, see that day's
 * stops. Mirrors [JournalCalendarActivity]'s pattern; the calendar is
 * clamped to the trip's own date range, and opens on the trip's start date
 * (not "today", since a future trip would otherwise open on an empty day).
 */
class ItineraryCalendarActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TRIP_ID = "itinerary_trip_id"
    }

    private lateinit var trip: ItineraryTrip
    private lateinit var adapter: ItineraryStopAdapter
    private lateinit var emptyView: TextView
    private lateinit var calendarView: CalendarView
    private var currentDate: LocalDate = LocalDate.now()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val tripId = intent.getStringExtra(EXTRA_TRIP_ID)
        val existing = tripId?.let { ItineraryTripStore.get(this, it) }
        if (existing == null) {
            finish()
            return
        }
        trip = existing
        setContentView(R.layout.activity_itinerary_calendar)
        title = trip.name.ifBlank { getString(R.string.itinerary_untitled_trip) }

        emptyView = findViewById(R.id.empty_view)
        adapter = ItineraryStopAdapter { stop ->
            startActivity(
                Intent(this, EditItineraryStopActivity::class.java)
                    .putExtra(EditItineraryStopActivity.EXTRA_TRIP_ID, trip.id)
                    .putExtra(EditItineraryStopActivity.EXTRA_STOP_ID, stop.id)
            )
        }
        findViewById<RecyclerView>(R.id.recycler).apply {
            layoutManager = LinearLayoutManager(this@ItineraryCalendarActivity)
            adapter = this@ItineraryCalendarActivity.adapter
        }

        calendarView = findViewById(R.id.calendar_view)
        val zone = ZoneId.systemDefault()
        calendarView.minDate = trip.start().atStartOfDay(zone).toInstant().toEpochMilli()
        calendarView.maxDate = trip.end().atStartOfDay(zone).toInstant().toEpochMilli()
        calendarView.setOnDateChangeListener { _, year, month, dayOfMonth ->
            showStopsFor(LocalDate.of(year, month + 1, dayOfMonth))
        }

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(
                Intent(this, EditItineraryStopActivity::class.java)
                    .putExtra(EditItineraryStopActivity.EXTRA_TRIP_ID, trip.id)
                    .putExtra(EditItineraryStopActivity.EXTRA_STOP_DATE, currentDate.toString())
            )
        }

        showStopsFor(trip.start())
    }

    override fun onResume() {
        super.onResume()
        // Re-pull the trip itself too: editing it (name/dates) or deleting it happens on
        // EditItineraryTripActivity, which this screen returns to.
        val refreshedTrip = ItineraryTripStore.get(this, trip.id)
        if (refreshedTrip == null) {
            finish()
            return
        }
        trip = refreshedTrip
        title = trip.name.ifBlank { getString(R.string.itinerary_untitled_trip) }
        val zone = ZoneId.systemDefault()
        calendarView.minDate = trip.start().atStartOfDay(zone).toInstant().toEpochMilli()
        calendarView.maxDate = trip.end().atStartOfDay(zone).toInstant().toEpochMilli()
        // Re-pull in case a stop for this date was added/edited/deleted since this screen opened.
        showStopsFor(currentDate)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.itinerary_calendar_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_edit_trip -> {
            startActivity(
                Intent(this, EditItineraryTripActivity::class.java)
                    .putExtra(EditItineraryTripActivity.EXTRA_TRIP_ID, trip.id)
            )
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    private fun showStopsFor(date: LocalDate) {
        currentDate = date
        val stops = ItineraryStopStore.getForDate(this, trip.id, date.toString())
        adapter.submit(stops)
        emptyView.visibility = if (stops.isEmpty()) View.VISIBLE else View.GONE
    }
}
