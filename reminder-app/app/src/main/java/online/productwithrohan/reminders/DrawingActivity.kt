package online.productwithrohan.reminders

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.ImageButton
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import java.io.File
import java.io.FileOutputStream

/** A simple freehand sketch screen; "Done" hands the drawn PNG back to [NoteEditActivity] to attach as an image. */
class DrawingActivity : AppCompatActivity() {

    private lateinit var drawingView: DrawingView
    private lateinit var eraserButton: ImageButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_drawing)
        title = getString(R.string.title_drawing)

        val toolbar = findViewById<Toolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        drawingView = findViewById(R.id.drawing_view)
        eraserButton = findViewById(R.id.button_eraser)

        findViewById<ImageButton>(R.id.button_undo).setOnClickListener { drawingView.undo() }
        findViewById<ImageButton>(R.id.button_redo).setOnClickListener { drawingView.redo() }
        eraserButton.setOnClickListener {
            drawingView.eraseMode = !drawingView.eraseMode
            eraserButton.alpha = if (drawingView.eraseMode) 1f else 0.5f
        }

        buildColorSwatches()
    }

    private fun buildColorSwatches() {
        val container = findViewById<LinearLayout>(R.id.color_swatch_row)
        val colors = listOf(
            Color.BLACK, Color.parseColor("#D32F2F"), Color.parseColor("#F57C00"),
            Color.parseColor("#FBC02D"), Color.parseColor("#388E3C"), Color.parseColor("#1976D2"),
            Color.parseColor("#7B1FA2"), Color.parseColor("#5D4037"),
        )
        val sizePx = (28 * resources.displayMetrics.density).toInt()
        val marginPx = (6 * resources.displayMetrics.density).toInt()
        colors.forEachIndexed { index, c ->
            val swatch = ImageButton(this).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(c)
                    setStroke((1.5f * resources.displayMetrics.density).toInt(), Color.parseColor("#33000000"))
                }
                contentDescription = getString(R.string.drawing_color)
                setOnClickListener {
                    drawingView.color = c
                    drawingView.eraseMode = false
                    eraserButton.alpha = 0.5f
                }
            }
            val lp = LinearLayout.LayoutParams(sizePx, sizePx).apply {
                marginStart = if (index == 0) 0 else marginPx
                marginEnd = marginPx
            }
            container.addView(swatch, lp)
            if (index == 0) drawingView.color = c
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.drawing_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        android.R.id.home -> { finish(); true }
        R.id.action_done_drawing -> { saveAndFinish(); true }
        else -> super.onOptionsItemSelected(item)
    }

    private fun saveAndFinish() {
        if (drawingView.isEmpty()) {
            finish()
            return
        }
        val bmp = drawingView.exportBitmap()
        val file = File(cacheDir, "drawing_${System.currentTimeMillis()}.png")
        FileOutputStream(file).use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
        setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_RESULT_PATH, file.absolutePath))
        finish()
    }

    companion object {
        const val EXTRA_RESULT_PATH = "drawing_result_path"
    }
}
