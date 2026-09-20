package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class ItineraryStopAdapter(
    private val onClick: (ItineraryStop) -> Unit,
) : RecyclerView.Adapter<ItineraryStopAdapter.Holder>() {

    private val items = mutableListOf<ItineraryStop>()

    fun submit(list: List<ItineraryStop>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val time: TextView = view.findViewById(R.id.item_stop_time)
        val title: TextView = view.findViewById(R.id.item_stop_title)
        val detail: TextView = view.findViewById(R.id.item_stop_detail)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_itinerary_stop, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val stop = items[position]
        holder.time.text = stop.time ?: "•"
        holder.title.text = stop.title
        val detail = listOf(stop.location, stop.notes).filter { it.isNotBlank() }.joinToString(" · ")
        holder.detail.text = detail
        holder.detail.visibility = if (detail.isBlank()) View.GONE else View.VISIBLE
        holder.itemView.setOnClickListener { onClick(stop) }
    }
}
