package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.time.LocalDate

/**
 * Trip list -- every trip the user has planned, past and future. Tapping one
 * opens its day-by-day calendar ([ItineraryCalendarActivity]); the FAB starts
 * a new trip ([EditItineraryTripActivity]).
 */
class ItineraryActivity : AppCompatActivity() {

    private lateinit var adapter: ItineraryTripAdapter
    private lateinit var emptyView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_itinerary)
        title = getString(R.string.title_itinerary)

        emptyView = findViewById(R.id.empty_view)
        adapter = ItineraryTripAdapter(
            getString(R.string.itinerary_section_upcoming),
            getString(R.string.itinerary_section_past),
        ) { trip ->
            startActivity(
                Intent(this, ItineraryCalendarActivity::class.java)
                    .putExtra(ItineraryCalendarActivity.EXTRA_TRIP_ID, trip.id)
            )
        }
        findViewById<RecyclerView>(R.id.recycler).apply {
            layoutManager = LinearLayoutManager(this@ItineraryActivity)
            adapter = this@ItineraryActivity.adapter
        }

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, EditItineraryTripActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        refresh()
        ItinerarySyncManager.syncAsync(this) { changed ->
            if (changed) runOnUiThread { refresh() }
        }
    }

    private fun refresh() {
        val today = LocalDate.now()
        // Upcoming/current trips soonest-first, past trips most-recent-first,
        // shown under separate "Upcoming"/"Past" section headers.
        val (upcoming, past) = ItineraryTripStore.getAll(this).partition { it.isUpcoming(today) }
        val upcomingSorted = upcoming.sortedBy { it.start() }
        val pastSorted = past.sortedByDescending { it.start() }
        val stops = ItineraryStopStore.getAll(this)
        val stopCounts = stops.groupingBy { it.tripId }.eachCount()
        adapter.submit(upcomingSorted, pastSorted, stopCounts)
        emptyView.visibility = if (upcomingSorted.isEmpty() && pastSorted.isEmpty()) View.VISIBLE else View.GONE
        ItineraryWidgetProvider.refreshAll(this)
    }
}
