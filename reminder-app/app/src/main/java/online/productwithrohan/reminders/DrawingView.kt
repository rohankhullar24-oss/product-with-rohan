package online.productwithrohan.reminders

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

/**
 * Minimal freehand drawing canvas for note sketches: one [Path]+[Paint] per
 * stroke, kept in a list so undo/redo is just popping/pushing strokes (no
 * bitmap-diffing needed since strokes never overlap in a way that matters
 * for this use case — a saved note drawing, not a layered image editor).
 */
class DrawingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private data class Stroke(val path: Path, val paint: Paint)

    private val strokes = mutableListOf<Stroke>()
    private val redoStack = mutableListOf<Stroke>()
    private var activePath: Path? = null

    var color: Int = Color.BLACK
    var strokeWidthPx: Float = 8f
    var eraseMode: Boolean = false
    var highlighterMode: Boolean = false

    private fun newPaint(): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
        strokeCap = Paint.Cap.ROUND
        when {
            eraseMode -> {
                color = Color.WHITE
                strokeWidth = strokeWidthPx * 3
            }
            else -> {
                color = this@DrawingView.color
                strokeWidth = strokeWidthPx
                alpha = if (highlighterMode) 90 else 255
            }
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                redoStack.clear()
                val path = Path().apply { moveTo(event.x, event.y) }
                activePath = path
                strokes.add(Stroke(path, newPaint()))
            }
            MotionEvent.ACTION_MOVE -> activePath?.lineTo(event.x, event.y)
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> activePath = null
        }
        invalidate()
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.WHITE)
        strokes.forEach { canvas.drawPath(it.path, it.paint) }
    }

    fun undo() {
        if (strokes.isEmpty()) return
        redoStack.add(strokes.removeAt(strokes.size - 1))
        invalidate()
    }

    fun redo() {
        if (redoStack.isEmpty()) return
        strokes.add(redoStack.removeAt(redoStack.size - 1))
        invalidate()
    }

    fun clear() {
        strokes.clear()
        redoStack.clear()
        invalidate()
    }

    fun isEmpty(): Boolean = strokes.isEmpty()

    fun exportBitmap(): Bitmap {
        val bmp = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        draw(Canvas(bmp))
        return bmp
    }
}
