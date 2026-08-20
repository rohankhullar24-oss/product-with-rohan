package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.text.DateFormat
import java.util.Date

class JournalAdapter(
    private val onClick: (JournalEntry) -> Unit,
) : RecyclerView.Adapter<JournalAdapter.Holder>() {

    private val items = mutableListOf<JournalEntry>()

    fun submit(list: List<JournalEntry>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val date: TextView = view.findViewById(R.id.item_date)
        val text: TextView = view.findViewById(R.id.item_text)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_journal, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val entry = items[position]
        holder.date.text = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
            .format(Date(entry.updatedAt))
        holder.text.text = entry.text
        holder.itemView.setOnClickListener { onClick(entry) }
    }
}
