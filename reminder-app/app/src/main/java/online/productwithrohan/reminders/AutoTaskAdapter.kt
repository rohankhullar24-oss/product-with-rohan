package online.productwithrohan.reminders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class AutoTaskAdapter(
    private val onClick: (AutoTask) -> Unit,
) : RecyclerView.Adapter<AutoTaskAdapter.Holder>() {

    private val items = mutableListOf<AutoTask>()

    fun submit(list: List<AutoTask>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.item_title)
        val subtitle: TextView = view.findViewById(R.id.item_subtitle)
        val status: TextView = view.findViewById(R.id.item_status)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_auto_task, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val task = items[position]
        val context = holder.itemView.context
        holder.title.text = task.displayTitle()

        val time = Instant.ofEpochMilli(task.scheduledAt).atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ofPattern("EEE d MMM, HH:mm"))
        holder.subtitle.text = context.getString(R.string.auto_task_subtitle, channelLabel(task), time)

        holder.status.text = when (task.status) {
            AutoTaskStatus.PENDING -> context.getString(R.string.auto_task_status_pending)
            AutoTaskStatus.DONE -> context.getString(R.string.auto_task_status_done)
            AutoTaskStatus.FAILED -> task.failureReason ?: context.getString(R.string.auto_task_status_failed)
        }
        holder.status.setTextColor(
            context.getColor(
                when (task.status) {
                    AutoTaskStatus.FAILED -> android.R.color.holo_red_dark
                    AutoTaskStatus.DONE -> android.R.color.holo_green_dark
                    AutoTaskStatus.PENDING -> android.R.color.darker_gray
                }
            )
        )

        holder.itemView.setOnClickListener { onClick(task) }
    }

    private fun channelLabel(task: AutoTask): String = task.channel.name.lowercase()
        .replaceFirstChar { it.uppercase() }
}
