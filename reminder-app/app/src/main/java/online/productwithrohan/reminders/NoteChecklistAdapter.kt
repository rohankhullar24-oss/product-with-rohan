package online.productwithrohan.reminders

import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageButton
import androidx.core.widget.doAfterTextChanged
import androidx.recyclerview.widget.RecyclerView

/**
 * Editable checklist rows for [NoteEditActivity], plus a trailing "Add item"
 * footer row. Edits the passed-in mutable list directly (no copy), same
 * immediate-mutation style [NoteEditActivity] uses for images/audio.
 */
class NoteChecklistAdapter(
    private val items: MutableList<ChecklistItem>,
    private val onChanged: () -> Unit,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    override fun getItemCount(): Int = items.size + 1

    override fun getItemViewType(position: Int): Int =
        if (position == items.size) TYPE_FOOTER else TYPE_ITEM

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_FOOTER) {
            FooterHolder(inflater.inflate(R.layout.item_note_checklist_add, parent, false))
        } else {
            ItemHolder(inflater.inflate(R.layout.item_note_checklist_edit, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        if (holder is FooterHolder) {
            holder.itemView.setOnClickListener {
                items.add(ChecklistItem())
                notifyItemInserted(items.size - 1)
                onChanged()
            }
            return
        }
        (holder as ItemHolder).bind(items[position])
    }

    inner class ItemHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val checkbox: CheckBox = view.findViewById(R.id.checkbox_item)
        private val input: EditText = view.findViewById(R.id.input_item_text)
        private val remove: ImageButton = view.findViewById(R.id.button_remove_item)
        private var watcher: TextWatcher? = null

        fun bind(item: ChecklistItem) {
            checkbox.setOnCheckedChangeListener(null)
            checkbox.isChecked = item.checked
            checkbox.setOnCheckedChangeListener { _, checked ->
                item.checked = checked
                onChanged()
            }

            watcher?.let { input.removeTextChangedListener(it) }
            if (input.text?.toString() != item.text) input.setText(item.text)
            watcher = input.doAfterTextChanged { text ->
                item.text = text?.toString().orEmpty()
                onChanged()
            }

            remove.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_POSITION && pos < items.size) {
                    items.removeAt(pos)
                    notifyItemRemoved(pos)
                    onChanged()
                }
            }
        }
    }

    class FooterHolder(view: View) : RecyclerView.ViewHolder(view)

    companion object {
        private const val TYPE_ITEM = 0
        private const val TYPE_FOOTER = 1
    }
}
