package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/**
 * Generic title/subtitle row adapter, shared by [RecipientListActivity] and
 * [TemplateActivity] since both are just named-item lists that open an edit
 * screen on tap.
 */
class SimpleListAdapter<T>(
    private val title: (T) -> String,
    private val subtitle: (T) -> String,
    private val onClick: (T) -> Unit,
) : RecyclerView.Adapter<SimpleListAdapter.Holder>() {

    private val items = mutableListOf<T>()

    fun submit(list: List<T>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.item_title)
        val subtitle: TextView = view.findViewById(R.id.item_subtitle)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_simple_list, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val item = items[position]
        holder.title.text = title(item)
        holder.subtitle.text = subtitle(item)
        holder.itemView.setOnClickListener { onClick(item) }
    }
}
