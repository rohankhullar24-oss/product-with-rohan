package online.productwithrohan.reminders

import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import androidx.recyclerview.widget.RecyclerView

/**
 * One row per paragraph: a multi-line text field plus whole-paragraph
 * bold/italic toggles and a delete button. Mirrors PdfPageAdapter's
 * position-safe callback shape, plus the "remove the old TextWatcher before
 * rebinding" pattern needed because, unlike PdfPageAdapter's buttons, this
 * item has an editable text field that must survive RecyclerView recycling
 * without cross-wiring edits onto the wrong paragraph.
 */
class DocxParagraphAdapter(
    private val onBoldToggle: (Int) -> Unit,
    private val onItalicToggle: (Int) -> Unit,
    private val onDelete: (Int) -> Unit,
) : RecyclerView.Adapter<DocxParagraphAdapter.ViewHolder>() {

    private val paragraphs = ArrayList<DocxEngine.Paragraph>()

    fun submit(newParagraphs: List<DocxEngine.Paragraph>) {
        paragraphs.clear()
        paragraphs.addAll(newParagraphs)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_docx_paragraph, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val paragraph = paragraphs[position]

        holder.watcher?.let { holder.text.removeTextChangedListener(it) }
        if (holder.text.text.toString() != paragraph.text) holder.text.setText(paragraph.text)
        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val pos = holder.bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) paragraphs[pos].text = s?.toString() ?: ""
            }
        }
        holder.text.addTextChangedListener(watcher)
        holder.watcher = watcher

        holder.bold.alpha = if (paragraph.bold) 1f else 0.4f
        holder.italic.alpha = if (paragraph.italic) 1f else 0.4f
        holder.bold.setOnClickListener { holder.withPosition(onBoldToggle) }
        holder.italic.setOnClickListener { holder.withPosition(onItalicToggle) }
        holder.delete.setOnClickListener { holder.withPosition(onDelete) }
    }

    /** Re-applies just the bold/italic alpha for a paragraph whose style toggled, without touching its EditText. */
    fun refreshStyle(position: Int, recyclerView: RecyclerView) {
        val holder = recyclerView.findViewHolderForAdapterPosition(position) as? ViewHolder ?: return
        val paragraph = paragraphs.getOrNull(position) ?: return
        holder.bold.alpha = if (paragraph.bold) 1f else 0.4f
        holder.italic.alpha = if (paragraph.italic) 1f else 0.4f
    }

    override fun getItemCount(): Int = paragraphs.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val text: EditText = view.findViewById(R.id.paragraph_text)
        val bold: Button = view.findViewById(R.id.button_bold)
        val italic: Button = view.findViewById(R.id.button_italic)
        val delete: Button = view.findViewById(R.id.button_delete)
        var watcher: TextWatcher? = null

        fun withPosition(action: (Int) -> Unit) {
            val pos = bindingAdapterPosition
            if (pos != RecyclerView.NO_POSITION) action(pos)
        }
    }
}
