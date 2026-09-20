package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.time.format.DateTimeFormatter

class ItineraryTripAdapter(
    private val headerLabelUpcoming: String,
    private val headerLabelPast: String,
    private val onClick: (ItineraryTrip) -> Unit,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private sealed class Row {
        data class Header(val label: String) : Row()
        data class Item(val trip: ItineraryTrip, val stopCount: Int) : Row()
    }

    private companion object {
        const val VIEW_TYPE_HEADER = 0
        const val VIEW_TYPE_TRIP = 1
    }

    private val rows = mutableListOf<Row>()

    /**
     * [upcoming] and [past] are each already sorted by the caller; this only
     * adds the section headers between them (a header is skipped when its
     * section is empty, so a trip list with only past trips shows no
     * "Upcoming" header at all).
     */
    fun submit(upcoming: List<ItineraryTrip>, past: List<ItineraryTrip>, stopCounts: Map<String, Int>) {
        rows.clear()
        if (upcoming.isNotEmpty()) {
            rows.add(Row.Header(headerLabelUpcoming))
            upcoming.forEach { rows.add(Row.Item(it, stopCounts[it.id] ?: 0)) }
        }
        if (past.isNotEmpty()) {
            rows.add(Row.Header(headerLabelPast))
            past.forEach { rows.add(Row.Item(it, stopCounts[it.id] ?: 0)) }
        }
        notifyDataSetChanged()
    }

    class HeaderHolder(view: View) : RecyclerView.ViewHolder(view) {
        val label: TextView = view as TextView
    }

    class ItemHolder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.item_trip_name)
        val dates: TextView = view.findViewById(R.id.item_trip_dates)
        val stops: TextView = view.findViewById(R.id.item_trip_stops)
    }

    override fun getItemViewType(position: Int): Int = when (rows[position]) {
        is Row.Header -> VIEW_TYPE_HEADER
        is Row.Item -> VIEW_TYPE_TRIP
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == VIEW_TYPE_HEADER) {
            HeaderHolder(inflater.inflate(R.layout.item_itinerary_section_header, parent, false))
        } else {
            ItemHolder(inflater.inflate(R.layout.item_itinerary_trip, parent, false))
        }
    }

    override fun getItemCount(): Int = rows.size

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = rows[position]) {
            is Row.Header -> (holder as HeaderHolder).label.text = row.label
            is Row.Item -> bindTrip(holder as ItemHolder, row.trip, row.stopCount)
        }
    }

    private fun bindTrip(holder: ItemHolder, trip: ItineraryTrip, count: Int) {
        val context = holder.itemView.context
        val fmt = DateTimeFormatter.ofPattern("d MMM")
        holder.name.text = trip.name.ifBlank { context.getString(R.string.itinerary_untitled_trip) }
        holder.dates.text = "${trip.start().format(fmt)} – ${trip.end().format(fmt)}"
        holder.stops.text = if (count == 0) {
            context.getString(R.string.itinerary_no_stops_yet)
        } else {
            context.resources.getQuantityString(R.plurals.itinerary_stop_count, count, count)
        }
        holder.itemView.setOnClickListener { onClick(trip) }
    }
}
