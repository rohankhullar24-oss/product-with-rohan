package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.time.format.DateTimeFormatter

class ItineraryTripAdapter(
    private val onClick: (ItineraryTrip) -> Unit,
) : RecyclerView.Adapter<ItineraryTripAdapter.Holder>() {

    private val items = mutableListOf<ItineraryTrip>()
    private var stopCounts: Map<String, Int> = emptyMap()

    fun submit(list: List<ItineraryTrip>, stopCounts: Map<String, Int>) {
        items.clear()
        items.addAll(list)
        this.stopCounts = stopCounts
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.item_trip_name)
        val dates: TextView = view.findViewById(R.id.item_trip_dates)
        val stops: TextView = view.findViewById(R.id.item_trip_stops)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_itinerary_trip, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val trip = items[position]
        val context = holder.itemView.context
        val fmt = DateTimeFormatter.ofPattern("d MMM")
        holder.name.text = trip.name.ifBlank { context.getString(R.string.itinerary_untitled_trip) }
        holder.dates.text = "${trip.start().format(fmt)} – ${trip.end().format(fmt)}"
        val count = stopCounts[trip.id] ?: 0
        holder.stops.text = if (count == 0) {
            context.getString(R.string.itinerary_no_stops_yet)
        } else {
            context.resources.getQuantityString(R.plurals.itinerary_stop_count, count, count)
        }
        holder.itemView.setOnClickListener { onClick(trip) }
    }
}
