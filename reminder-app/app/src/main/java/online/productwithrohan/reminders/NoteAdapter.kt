package online.productwithrohan.reminders

import android.content.res.Configuration
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

private const val VIEW_TYPE_HEADER = 0
private const val VIEW_TYPE_NOTE = 1

private sealed class Row {
    data class Header(val titleRes: Int) : Row()
    data class NoteRow(val note: Note) : Row()
}

/** Sectioned (Pinned / Others) staggered-grid list of note cards, modeled on [JournalAdapter]. */
class NoteAdapter(
    private val onClick: (Note) -> Unit,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val rows = mutableListOf<Row>()

    /** Notes already filtered/sorted by the caller (search + archived state). */
    fun submit(notes: List<Note>) {
        rows.clear()
        val pinned = notes.filter { it.pinned }
        val others = notes.filter { !it.pinned }
        if (pinned.isNotEmpty()) {
            rows.add(Row.Header(R.string.notes_section_pinned))
            pinned.forEach { rows.add(Row.NoteRow(it)) }
        }
        if (others.isNotEmpty()) {
            if (pinned.isNotEmpty()) rows.add(Row.Header(R.string.notes_section_others))
            others.forEach { rows.add(Row.NoteRow(it)) }
        }
        notifyDataSetChanged()
    }

    override fun getItemViewType(position: Int): Int =
        if (rows[position] is Row.Header) VIEW_TYPE_HEADER else VIEW_TYPE_NOTE

    override fun getItemCount(): Int = rows.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == VIEW_TYPE_HEADER) {
            val view = inflater.inflate(R.layout.item_note_section_header, parent, false)
            HeaderHolder(view)
        } else {
            val view = inflater.inflate(R.layout.item_note, parent, false)
            NoteHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = rows[position]) {
            is Row.Header -> (holder as HeaderHolder).bind(row.titleRes)
            is Row.NoteRow -> (holder as NoteHolder).bind(row.note, onClick)
        }
    }

    class HeaderHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val text: TextView = view.findViewById(R.id.header_text)

        init {
            val lp = view.layoutParams
            if (lp is androidx.recyclerview.widget.StaggeredGridLayoutManager.LayoutParams) {
                lp.isFullSpan = true
            }
        }

        fun bind(titleRes: Int) {
            text.setText(titleRes)
        }
    }

    class NoteHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val card: com.google.android.material.card.MaterialCardView = view as com.google.android.material.card.MaterialCardView
        private val title: TextView = view.findViewById(R.id.item_title)
        private val text: TextView = view.findViewById(R.id.item_text)
        private val checklistContainer: LinearLayout = view.findViewById(R.id.item_checklist)
        private val pinIcon: View = view.findViewById(R.id.item_pin_icon)
        private val thumbnail: android.widget.ImageView = view.findViewById(R.id.item_thumbnail)
        private val audioBadge: TextView = view.findViewById(R.id.item_audio_badge)

        fun bind(note: Note, onClick: (Note) -> Unit) {
            val context = itemView.context
            val isDark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
            val color = NoteColors.colorFor(note.color, isDark)
            // "default" resolves to TRANSPARENT (no override) -- fall back to the
            // theme's card surface color so a recycled colored card doesn't stay tinted.
            card.setCardBackgroundColor(if (color == android.graphics.Color.TRANSPARENT) themeSurfaceColor(context) else color)

            title.visibility = if (note.title.isBlank()) View.GONE else View.VISIBLE
            title.text = note.title

            if (note.isChecklist) {
                text.visibility = View.GONE
                checklistContainer.visibility = View.VISIBLE
                checklistContainer.removeAllViews()
                val inflater = LayoutInflater.from(context)
                val shown = note.checklist.take(6)
                shown.forEach { item ->
                    val row = inflater.inflate(R.layout.item_note_checklist_preview, checklistContainer, false) as TextView
                    row.text = item.text
                    row.paintFlags = if (item.checked) {
                        row.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                    } else {
                        row.paintFlags and android.graphics.Paint.STRIKE_THRU_TEXT_FLAG.inv()
                    }
                    row.alpha = if (item.checked) 0.6f else 1f
                    checklistContainer.addView(row)
                }
                if (note.checklist.size > shown.size) {
                    val more = TextView(context).apply {
                        text = context.getString(R.string.notes_more_items, note.checklist.size - shown.size)
                        alpha = 0.6f
                        textSize = 13f
                    }
                    checklistContainer.addView(more)
                }
            } else {
                checklistContainer.visibility = View.GONE
                text.visibility = if (note.body.isBlank()) View.GONE else View.VISIBLE
                text.text = note.body
            }

            pinIcon.visibility = if (note.pinned) View.VISIBLE else View.GONE

            if (note.images.isNotEmpty()) {
                thumbnail.visibility = View.VISIBLE
                NoteThumbnailLoader.load(thumbnail, note.images.first())
            } else {
                thumbnail.visibility = View.GONE
            }

            audioBadge.visibility = if (note.audio.isNotEmpty()) View.VISIBLE else View.GONE

            itemView.setOnClickListener { onClick(note) }
        }

        private fun themeSurfaceColor(context: android.content.Context): Int {
            val typedValue = android.util.TypedValue()
            context.theme.resolveAttribute(com.google.android.material.R.attr.colorSurface, typedValue, true)
            return typedValue.data
        }
    }
}
