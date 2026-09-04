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

        val whenText = when (task.recurrence) {
            AutoRecurrence.ONE_TIME -> Instant.ofEpochMilli(task.scheduledAt).atZone(ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("EEE d MMM, HH:mm"))
            AutoRecurrence.DAILY -> context.getString(R.string.auto_recurrence_daily_at, task.timeOfDay)
            AutoRecurrence.WEEKDAYS -> context.getString(R.string.auto_recurrence_weekdays_at, task.timeOfDay)
        }
        holder.subtitle.text = context.getString(R.string.auto_task_subtitle, channelLabel(task), whenText)

        holder.status.text = when {
            task.status == AutoTaskStatus.FAILED -> task.failureReason ?: context.getString(R.string.auto_task_status_failed)
            task.status == AutoTaskStatus.DONE -> context.getString(R.string.auto_task_status_done)
            task.lastFiredAt != null -> {
                val lastTime = Instant.ofEpochMilli(task.lastFiredAt!!).atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ofPattern("d MMM, HH:mm"))
                val base = context.getString(R.string.auto_task_last_fired, task.lastResult, lastTime)
                if (task.recurrence == AutoRecurrence.ONE_TIME && task.retryOnFailure && task.retryCount > 0) {
                    base + context.getString(R.string.auto_task_retry_suffix, task.retryCount, AutoTaskFireRecorder.MAX_AUTO_RETRIES)
                } else base
            }
            else -> context.getString(R.string.auto_task_status_pending)
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
