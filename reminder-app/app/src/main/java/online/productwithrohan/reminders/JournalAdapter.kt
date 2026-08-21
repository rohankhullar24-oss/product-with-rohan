package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
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
        val thumbnail: ImageView = view.findViewById(R.id.item_thumbnail)
        val title: TextView = view.findViewById(R.id.item_title)
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
        val context = holder.itemView.context

        val badges = buildString {
            if (entry.videoFile != null) append(" 🎥")
            if (entry.audioFile != null) append(" 🎤")
            if (entry.hasLocation()) append(" 📍")
            entry.placeName?.let { append(" $it") }
        }
        holder.date.text = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
            .format(Date(entry.updatedAt)) + badges

        // A journal entry has no separate title field — the first line reads as
        // one when there's more text after it, same as most notes/journal apps.
        val newlineIndex = entry.text.indexOf('\n')
        if (newlineIndex > 0) {
            holder.title.visibility = View.VISIBLE
            holder.title.text = entry.text.substring(0, newlineIndex).trim()
            holder.text.text = entry.text.substring(newlineIndex + 1).trim()
        } else {
            holder.title.visibility = View.GONE
            holder.text.text = entry.text
        }

        ThumbnailLoader.load(holder.thumbnail, entry.photoFile)

        holder.itemView.setOnClickListener { onClick(entry) }
    }
}
