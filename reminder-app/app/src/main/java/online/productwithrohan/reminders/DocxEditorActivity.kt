package online.productwithrohan.reminders

import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.io.File
import java.util.concurrent.Executors

private const val DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

/**
 * Paragraph-list editor over [DocxEngine]: create blank / open / edit / save,
 * plus a Phase 4 "Convert to PDF" action via [DocumentConverter] and a
 * "Compress a file" action via [OoxmlCompressor] that works on any picked
 * docx directly (bypassing the lossy paragraph-only engine — see
 * OoxmlCompressor's doc comment for why that matters).
 */
class DocxEditorActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var recycler: RecyclerView
    private lateinit var adapter: DocxParagraphAdapter
    private lateinit var statusText: TextView
    private lateinit var progress: ProgressBar
    private lateinit var saveButton: Button
    private lateinit var convertButton: Button

    private var document: DocxEngine.Document? = null
    private var busy = false

    private val openLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) loadFrom(uri)
        }

    private val saveAsLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(DOCX_MIME)) { uri ->
            if (uri != null) saveTo(uri)
        }

    private val convertPdfLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
            if (uri != null) convertToPdf(uri)
        }

    private val compressSourceLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) compressSource(uri)
        }

    private val compressDestinationLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(DOCX_MIME)) { uri ->
            val pending = pendingCompressedFile
            if (uri != null && pending != null) writeCompressedTo(uri, pending) else pendingCompressedFile?.delete()
        }

    private var pendingCompressedFile: File? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_docx_editor)
        title = getString(R.string.works_enabler_word_title)

        recycler = findViewById(R.id.recycler_paragraphs)
        statusText = findViewById(R.id.status_text)
        progress = findViewById(R.id.progress)
        saveButton = findViewById(R.id.button_save_as)
        convertButton = findViewById(R.id.button_convert_pdf)

        adapter = DocxParagraphAdapter(
            onBoldToggle = { index -> toggleBold(index) },
            onItalicToggle = { index -> toggleItalic(index) },
            onDelete = { index -> deleteParagraph(index) },
        )
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<Button>(R.id.button_open).setOnClickListener {
            if (!busy) openLauncher.launch(arrayOf(DOCX_MIME))
        }
        findViewById<Button>(R.id.button_new).setOnClickListener { if (!busy) newBlank() }
        findViewById<Button>(R.id.button_add_paragraph).setOnClickListener { addParagraph() }
        saveButton.setOnClickListener { if (!busy) saveAsLauncher.launch("document.docx") }
        convertButton.setOnClickListener { if (!busy) convertPdfLauncher.launch("document.pdf") }
        findViewById<Button>(R.id.button_compress_file).setOnClickListener {
            if (!busy) compressSourceLauncher.launch(arrayOf(DOCX_MIME))
        }

        newBlank()
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
    }

    private fun newBlank() {
        applyDocument(DocxEngine.createBlank())
        statusText.text = getString(R.string.docx_new_done)
    }

    private fun loadFrom(uri: Uri) {
        setBusy(true, R.string.docx_loading)
        executor.execute {
            try {
                val temp = File(cacheDir, "docx_source_${System.currentTimeMillis()}.docx")
                contentResolver.openInputStream(uri)?.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected file")
                val doc = DocxEngine.load(temp)
                temp.delete()
                mainHandler.post {
                    applyDocument(doc)
                    setBusy(false, null)
                    statusText.text = getString(R.string.docx_opened)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.docx_open_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun saveTo(uri: Uri) {
        val doc = document ?: return
        setBusy(true, null)
        executor.execute {
            try {
                val temp = File(cacheDir, "docx_out_${System.currentTimeMillis()}.docx")
                DocxEngine.save(doc, temp)
                contentResolver.openOutputStream(uri)?.use { out ->
                    temp.inputStream().use { input -> input.copyTo(out) }
                } ?: throw IllegalStateException("could not open the destination")
                temp.delete()
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.docx_saved)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.docx_save_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun convertToPdf(uri: Uri) {
        val doc = document ?: return
        setBusy(true, R.string.docx_converting)
        executor.execute {
            try {
                val temp = File(cacheDir, "docx_to_pdf_${System.currentTimeMillis()}.pdf")
                DocumentConverter.docxToPdf(doc, temp)
                contentResolver.openOutputStream(uri)?.use { out ->
                    temp.inputStream().use { input -> input.copyTo(out) }
                } ?: throw IllegalStateException("could not open the destination")
                temp.delete()
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.docx_convert_done)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.docx_convert_failed, e.message ?: e.toString())
                }
            }
        }
    }

    // --- Compress a file (raw zip pass-through, independent of the loaded document) ---

    private fun compressSource(uri: Uri) {
        setBusy(true, R.string.ooxml_compressing)
        executor.execute {
            try {
                val source = File(cacheDir, "docx_compress_src_${System.currentTimeMillis()}.docx")
                contentResolver.openInputStream(uri)?.use { input ->
                    source.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected file")
                val destination = File(cacheDir, "docx_compress_out_${System.currentTimeMillis()}.docx")
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
                    compressDestinationLauncher.launch("compressed.docx")
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

    // --- Paragraph edits ---

    private fun addParagraph() {
        val doc = document ?: return
        doc.paragraphs.add(DocxEngine.Paragraph(""))
        adapter.submit(doc.paragraphs)
        recycler.scrollToPosition(doc.paragraphs.size - 1)
    }

    private fun toggleBold(index: Int) {
        val doc = document ?: return
        val paragraph = doc.paragraphs.getOrNull(index) ?: return
        paragraph.bold = !paragraph.bold
        adapter.refreshStyle(index, recycler)
    }

    private fun toggleItalic(index: Int) {
        val doc = document ?: return
        val paragraph = doc.paragraphs.getOrNull(index) ?: return
        paragraph.italic = !paragraph.italic
        adapter.refreshStyle(index, recycler)
    }

    private fun deleteParagraph(index: Int) {
        val doc = document ?: return
        if (index !in doc.paragraphs.indices) return
        doc.paragraphs.removeAt(index)
        if (doc.paragraphs.isEmpty()) doc.paragraphs.add(DocxEngine.Paragraph(""))
        adapter.submit(doc.paragraphs)
    }

    // --- Shared plumbing ---

    private fun applyDocument(doc: DocxEngine.Document) {
        document = doc
        adapter.submit(doc.paragraphs)
        updateButtonsEnabled()
    }

    private fun updateButtonsEnabled() {
        val hasDoc = document != null
        saveButton.isEnabled = hasDoc
        convertButton.isEnabled = hasDoc
    }

    private fun setBusy(isBusy: Boolean, statusRes: Int?) {
        busy = isBusy
        progress.visibility = if (isBusy) View.VISIBLE else View.GONE
        statusRes?.let { statusText.text = getString(it) }
    }

    private fun formatSize(bytes: Long): String {
        val kb = bytes / 1024.0
        return if (kb < 1024) String.format("%.0f KB", kb) else String.format("%.1f MB", kb / 1024)
    }
}
