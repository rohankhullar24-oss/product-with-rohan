package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.materialswitch.MaterialSwitch
import java.time.format.DateTimeFormatter

class ReminderAdapter(
    private val onClick: (Reminder) -> Unit,
    private val onToggle: (Reminder, Boolean) -> Unit,
) : RecyclerView.Adapter<ReminderAdapter.Holder>() {

    private val items = mutableListOf<Reminder>()

    fun submit(list: List<Reminder>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.item_title)
        val subtitle: TextView = view.findViewById(R.id.item_subtitle)
        val next: TextView = view.findViewById(R.id.item_next)
        val toggle: MaterialSwitch = view.findViewById(R.id.item_switch)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_reminder, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val reminder = items[position]
        val context = holder.itemView.context
        holder.title.text = reminder.title
        holder.subtitle.text = reminder.scheduleLabel()

        holder.next.text = when {
            reminder.completed -> context.getString(R.string.item_completed)
            !reminder.enabled -> context.getString(R.string.item_paused)
            else -> {
                val next = reminder.nextTrigger()
                if (next != null) {
                    context.getString(
                        R.string.item_next,
                        next.format(DateTimeFormatter.ofPattern("EEE d MMM, HH:mm"))
                    )
                } else ""
            }
        }

        holder.toggle.setOnCheckedChangeListener(null)
        holder.toggle.isChecked = reminder.enabled && !reminder.completed
        holder.toggle.isEnabled = !reminder.completed
        holder.toggle.setOnCheckedChangeListener { _, checked ->
            onToggle(reminder, checked)
        }

        holder.itemView.setOnClickListener { onClick(reminder) }
    }
}
