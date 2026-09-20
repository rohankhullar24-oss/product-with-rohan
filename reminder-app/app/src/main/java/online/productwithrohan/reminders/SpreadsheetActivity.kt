package online.productwithrohan.reminders

import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.util.concurrent.Executors

private const val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
private const val ROW_LABEL_WIDTH_DP = 40
private const val CELL_WIDTH_DP = 90

/**
 * Grid editor over [XlsxEngine]: create blank / open / edit / save. Only the
 * first sheet of a loaded workbook is shown and editable — other sheets, if
 * present, round-trip unchanged on save. The grid is built as plain
 * (non-recycled) EditText views rather than a RecyclerView: a 2D recycling
 * grid is easy to get subtly wrong (cross-wired listeners, misaligned
 * columns) and this sandbox has no device to catch that on, so the simpler,
 * easier-to-reason-about shape was chosen over the more scalable one. Cell
 * counts are capped ([XlsxEngine.MAX_ROWS] / [XlsxEngine.MAX_COLS]) to keep
 * the view count sane.
 */
class SpreadsheetActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var rowsContainer: LinearLayout
    private lateinit var statusText: TextView
    private lateinit var progress: ProgressBar
    private lateinit var saveButton: Button
    private lateinit var addRowButton: Button
    private lateinit var addColumnButton: Button

    private var workbook: XlsxEngine.Workbook? = null
    private var busy = false

    private val openLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) loadFrom(uri)
        }

    private val saveAsLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(XLSX_MIME)) { uri ->
            if (uri != null) saveTo(uri)
        }

    private val compressSourceLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) compressSource(uri)
        }

    private val compressDestinationLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(XLSX_MIME)) { uri ->
            val pending = pendingCompressedFile
            if (uri != null && pending != null) writeCompressedTo(uri, pending) else pendingCompressedFile?.delete()
        }

    private var pendingCompressedFile: File? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_spreadsheet)
        title = getString(R.string.works_enabler_spreadsheet_title)

        rowsContainer = findViewById(R.id.rows_container)
        statusText = findViewById(R.id.status_text)
        progress = findViewById(R.id.progress)
        saveButton = findViewById(R.id.button_save_as)
        addRowButton = findViewById(R.id.button_add_row)
        addColumnButton = findViewById(R.id.button_add_column)

        findViewById<Button>(R.id.button_open).setOnClickListener {
            if (!busy) openLauncher.launch(arrayOf(XLSX_MIME))
        }
        findViewById<Button>(R.id.button_new).setOnClickListener { if (!busy) newBlank() }
        addRowButton.setOnClickListener { addRow() }
        addColumnButton.setOnClickListener { addColumn() }
        saveButton.setOnClickListener { if (!busy) saveAsLauncher.launch("sheet.xlsx") }
        findViewById<Button>(R.id.button_compress_file).setOnClickListener {
            if (!busy) compressSourceLauncher.launch(arrayOf(XLSX_MIME))
        }

        newBlank()
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
    }

    private fun newBlank() {
        applyWorkbook(XlsxEngine.createBlank())
        statusText.text = getString(R.string.spreadsheet_new_done)
    }

    private fun loadFrom(uri: Uri) {
        setBusy(true, R.string.spreadsheet_loading)
        executor.execute {
            try {
                val temp = File(cacheDir, "xlsx_source_${System.currentTimeMillis()}.xlsx")
                contentResolver.openInputStream(uri)?.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected file")
                val wb = XlsxEngine.load(temp)
                temp.delete()
                mainHandler.post {
                    applyWorkbook(wb)
                    setBusy(false, null)
                    statusText.text = getString(R.string.spreadsheet_opened)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.spreadsheet_open_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun saveTo(uri: Uri) {
        val wb = workbook ?: return
        setBusy(true, null)
        executor.execute {
            try {
                val temp = File(cacheDir, "xlsx_out_${System.currentTimeMillis()}.xlsx")
                XlsxEngine.save(wb, temp)
                contentResolver.openOutputStream(uri)?.use { out ->
                    temp.inputStream().use { input -> input.copyTo(out) }
                } ?: throw IllegalStateException("could not open the destination")
                temp.delete()
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.spreadsheet_saved)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.spreadsheet_save_failed, e.message ?: e.toString())
                }
            }
        }
    }

    // --- Compress a file (raw zip pass-through, independent of the loaded workbook) ---

    private fun compressSource(uri: Uri) {
        setBusy(true, R.string.ooxml_compressing)
        executor.execute {
            try {
                val source = File(cacheDir, "xlsx_compress_src_${System.currentTimeMillis()}.xlsx")
                contentResolver.openInputStream(uri)?.use { input ->
                    source.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected file")
                val destination = File(cacheDir, "xlsx_compress_out_${System.currentTimeMillis()}.xlsx")
                val result = OoxmlCompressor.compress(source, destination)
                source.delete()
                pendingCompressedFile = destination
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(
                        R.string.ooxml_compress_ready,
                        formatSize(result.beforeTotalBytes),
                        formatSize(result.afterTotalBytes),
                    )
                    compressDestinationLauncher.launch("compressed.xlsx")
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.ooxml_compress_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun writeCompressedTo(uri: Uri, compressedFile: File) {
        executor.execute {
            try {
                contentResolver.openOutputStream(uri)?.use { out ->
                    compressedFile.inputStream().use { input -> input.copyTo(out) }
                } ?: throw IllegalStateException("could not open the destination")
                compressedFile.delete()
                pendingCompressedFile = null
                mainHandler.post { statusText.text = getString(R.string.ooxml_compress_saved) }
            } catch (e: Exception) {
                mainHandler.post {
                    statusText.text = getString(R.string.ooxml_compress_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun formatSize(bytes: Long): String {
        val kb = bytes / 1024.0
        return if (kb < 1024) String.format("%.0f KB", kb) else String.format("%.1f MB", kb / 1024)
    }

    // --- Grid growth (rebuilds the whole grid view; only happens on explicit user action) ---

    private fun addRow() {
        val sheet = workbook?.sheets?.firstOrNull() ?: return
        if (sheet.rows.size >= XlsxEngine.MAX_ROWS) return
        val cols = sheet.rows.firstOrNull()?.size ?: 0
        sheet.rows.add(MutableList(cols) { "" })
        renderGrid(sheet)
    }

    private fun addColumn() {
        val sheet = workbook?.sheets?.firstOrNull() ?: return
        val currentCols = sheet.rows.firstOrNull()?.size ?: 0
        if (currentCols >= XlsxEngine.MAX_COLS) return
        sheet.rows.forEach { it.add("") }
        renderGrid(sheet)
    }

    // --- View building ---

    private fun applyWorkbook(wb: XlsxEngine.Workbook) {
        workbook = wb
        renderGrid(wb.sheets.first())
        updateButtonsEnabled()
    }

    private fun renderGrid(sheet: XlsxEngine.Sheet) {
        rowsContainer.removeAllViews()
        val colCount = sheet.rows.firstOrNull()?.size ?: 0

        rowsContainer.addView(buildHeaderRow(colCount))
        sheet.rows.forEachIndexed { rowIndex, row ->
            rowsContainer.addView(buildDataRow(sheet, rowIndex, row.size))
        }
        addRowButton.isEnabled = sheet.rows.size < XlsxEngine.MAX_ROWS
        addColumnButton.isEnabled = colCount < XlsxEngine.MAX_COLS
    }

    private fun buildHeaderRow(colCount: Int): LinearLayout {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(labelCell(text = "", widthDp = ROW_LABEL_WIDTH_DP))
        for (col in 0 until colCount) {
            row.addView(labelCell(text = XlsxEngine.columnName(col), widthDp = CELL_WIDTH_DP))
        }
        return row
    }

    private fun buildDataRow(sheet: XlsxEngine.Sheet, rowIndex: Int, colCount: Int): LinearLayout {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(labelCell(text = (rowIndex + 1).toString(), widthDp = ROW_LABEL_WIDTH_DP))
        for (col in 0 until colCount) {
            row.addView(dataCell(sheet, rowIndex, col))
        }
        return row
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun labelCell(text: String, widthDp: Int): TextView {
        return TextView(this).apply {
            this.text = text
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(dp(widthDp), dp(44))
            setPadding(dp(4), dp(4), dp(4), dp(4))
            setTypeface(typeface, Typeface.BOLD)
            alpha = 0.8f
        }
    }

    private fun dataCell(sheet: XlsxEngine.Sheet, rowIndex: Int, colIndex: Int): EditText {
        return EditText(this).apply {
            setText(sheet.rows[rowIndex][colIndex])
            layoutParams = LinearLayout.LayoutParams(dp(CELL_WIDTH_DP), dp(44))
            setPadding(dp(6), dp(2), dp(6), dp(2))
            setSingleLine(true)
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    sheet.rows[rowIndex][colIndex] = s?.toString() ?: ""
                }
            })
        }
    }

    private fun updateButtonsEnabled() {
        val hasData = workbook != null
        saveButton.isEnabled = hasData
    }

    private fun setBusy(isBusy: Boolean, statusRes: Int?) {
        busy = isBusy
        progress.visibility = if (isBusy) View.VISIBLE else View.GONE
        statusRes?.let { statusText.text = getString(it) }
    }
}
