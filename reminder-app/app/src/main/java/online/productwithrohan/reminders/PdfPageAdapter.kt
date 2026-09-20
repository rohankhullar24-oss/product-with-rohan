package online.productwithrohan.reminders

import android.graphics.Bitmap
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/** One row per PDF page: a rendered thumbnail plus rotate/delete/reorder actions. */
class PdfPageAdapter(
    private val onRotate: (Int) -> Unit,
    private val onDelete: (Int) -> Unit,
    private val onMoveUp: (Int) -> Unit,
    private val onMoveDown: (Int) -> Unit,
) : RecyclerView.Adapter<PdfPageAdapter.ViewHolder>() {

    private val pages = ArrayList<Bitmap>()

    fun submit(newPages: List<Bitmap>) {
        pages.clear()
        pages.addAll(newPages)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_pdf_page, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.thumbnail.setImageBitmap(pages[position])
        holder.pageNumber.text = (position + 1).toString()
        holder.rotate.setOnClickListener { holder.withPosition(onRotate) }
        holder.delete.setOnClickListener { holder.withPosition(onDelete) }
        holder.moveUp.setOnClickListener { holder.withPosition(onMoveUp) }
        holder.moveDown.setOnClickListener { holder.withPosition(onMoveDown) }
    }

    override fun getItemCount(): Int = pages.size

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val thumbnail: ImageView = view.findViewById(R.id.page_thumbnail)
        val pageNumber: TextView = view.findViewById(R.id.page_number)
        val rotate: View = view.findViewById(R.id.button_rotate)
        val delete: View = view.findViewById(R.id.button_delete)
        val moveUp: View = view.findViewById(R.id.button_move_up)
        val moveDown: View = view.findViewById(R.id.button_move_down)

        fun withPosition(action: (Int) -> Unit) {
            val pos = bindingAdapterPosition
            if (pos != RecyclerView.NO_POSITION) action(pos)
        }
    }
}
