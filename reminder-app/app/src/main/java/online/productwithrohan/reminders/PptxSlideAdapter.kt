package online.productwithrohan.reminders

import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/**
 * One row per slide: title + body text fields, reorder buttons, delete.
 * Follows the same "remove old TextWatcher before rebinding" shape as
 * DocxParagraphAdapter — see its doc comment — but with two text fields
 * per item instead of one.
 */
class PptxSlideAdapter(
    private val onMoveUp: (Int) -> Unit,
    private val onMoveDown: (Int) -> Unit,
    private val onDelete: (Int) -> Unit,
) : RecyclerView.Adapter<PptxSlideAdapter.ViewHolder>() {

    private val slides = ArrayList<PptxEngine.Slide>()

    fun submit(newSlides: List<PptxEngine.Slide>) {
        slides.clear()
        slides.addAll(newSlides)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_pptx_slide, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val slide = slides[position]
        holder.number.text = holder.itemView.context.getString(R.string.pptx_slide_number, position + 1)

        holder.titleWatcher?.let { holder.title.removeTextChangedListener(it) }
        if (holder.title.text.toString() != slide.title) holder.title.setText(slide.title)
        val titleWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val pos = holder.bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) slides[pos].title = s?.toString() ?: ""
            }
        }
        holder.title.addTextChangedListener(titleWatcher)
        holder.titleWatcher = titleWatcher

        holder.bodyWatcher?.let { holder.body.removeTextChangedListener(it) }
        if (holder.body.text.toString() != slide.body) holder.body.setText(slide.body)
        val bodyWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val pos = holder.bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) slides[pos].body = s?.toString() ?: ""
            }
        }
        holder.body.addTextChangedListener(bodyWatcher)
        holder.bodyWatcher = bodyWatcher

        holder.moveUp.setOnClickListener { holder.withPosition(onMoveUp) }
        holder.moveDown.setOnClickListener { holder.withPosition(onMoveDown) }
        holder.delete.setOnClickListener { holder.withPosition(onDelete) }
    }

    override fun getItemCount(): Int = slides.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val number: TextView = view.findViewById(R.id.slide_number)
        val title: EditText = view.findViewById(R.id.slide_title)
        val body: EditText = view.findViewById(R.id.slide_body)
        val moveUp: Button = view.findViewById(R.id.button_move_up)
        val moveDown: Button = view.findViewById(R.id.button_move_down)
        val delete: Button = view.findViewById(R.id.button_delete)
        var titleWatcher: TextWatcher? = null
        var bodyWatcher: TextWatcher? = null

        fun withPosition(action: (Int) -> Unit) {
            val pos = bindingAdapterPosition
            if (pos != RecyclerView.NO_POSITION) action(pos)
        }
    }
}
