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

private const val PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

/**
 * Slide-list editor over [PptxEngine]: create blank / open / edit / save,
 * plus a "Compress a file" action via [OoxmlCompressor] (same
 * raw-zip-bypass shape as DocxEditorActivity's). No PDF conversion here —
 * Phase 4 only covers PDF<->Word.
 */
class PptxEditorActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var recycler: RecyclerView
    private lateinit var adapter: PptxSlideAdapter
    private lateinit var statusText: TextView
    private lateinit var progress: ProgressBar
    private lateinit var saveButton: Button

    private var presentation: PptxEngine.Presentation? = null
    private var busy = false

    private val openLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) loadFrom(uri)
        }

    private val saveAsLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(PPTX_MIME)) { uri ->
            if (uri != null) saveTo(uri)
        }

    private val compressSourceLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) compressSource(uri)
        }

    private val compressDestinationLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(PPTX_MIME)) { uri ->
            val pending = pendingCompressedFile
            if (uri != null && pending != null) writeCompressedTo(uri, pending) else pendingCompressedFile?.delete()
        }

    private var pendingCompressedFile: File? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pptx_editor)
        title = getString(R.string.works_enabler_powerpoint_title)

        recycler = findViewById(R.id.recycler_slides)
        statusText = findViewById(R.id.status_text)
        progress = findViewById(R.id.progress)
        saveButton = findViewById(R.id.button_save_as)

        adapter = PptxSlideAdapter(
            onMoveUp = { index -> moveSlide(index, index - 1) },
            onMoveDown = { index -> moveSlide(index, index + 1) },
            onDelete = { index -> deleteSlide(index) },
        )
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<Button>(R.id.button_open).setOnClickListener {
            if (!busy) openLauncher.launch(arrayOf(PPTX_MIME))
        }
        findViewById<Button>(R.id.button_new).setOnClickListener { if (!busy) newBlank() }
        findViewById<Button>(R.id.button_add_slide).setOnClickListener { addSlide() }
        saveButton.setOnClickListener { if (!busy) saveAsLauncher.launch("presentation.pptx") }
        findViewById<Button>(R.id.button_compress_file).setOnClickListener {
            if (!busy) compressSourceLauncher.launch(arrayOf(PPTX_MIME))
        }

        newBlank()
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
    }

    private fun newBlank() {
        applyPresentation(PptxEngine.createBlank())
        statusText.text = getString(R.string.pptx_new_done)
    }

    private fun loadFrom(uri: Uri) {
        setBusy(true, R.string.pptx_loading)
        executor.execute {
            try {
                val temp = File(cacheDir, "pptx_source_${System.currentTimeMillis()}.pptx")
                contentResolver.openInputStream(uri)?.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected file")
                val presentation = PptxEngine.load(temp)
                temp.delete()
                mainHandler.post {
                    applyPresentation(presentation)
                    setBusy(false, null)
                    statusText.text = getString(R.string.pptx_opened)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.pptx_open_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun saveTo(uri: Uri) {
        val presentation = presentation ?: return
        setBusy(true, null)
        executor.execute {
            try {
                val temp = File(cacheDir, "pptx_out_${System.currentTimeMillis()}.pptx")
                PptxEngine.save(presentation, temp)
                contentResolver.openOutputStream(uri)?.use { out ->
                    temp.inputStream().use { input -> input.copyTo(out) }
                } ?: throw IllegalStateException("could not open the destination")
                temp.delete()
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.pptx_saved)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.pptx_save_failed, e.message ?: e.toString())
                }
            }
        }
    }

    // --- Compress a file (raw zip pass-through, independent of the loaded presentation) ---

    private fun compressSource(uri: Uri) {
        setBusy(true, R.string.ooxml_compressing)
        executor.execute {
            try {
                val source = File(cacheDir, "pptx_compress_src_${System.currentTimeMillis()}.pptx")
                contentResolver.openInputStream(uri)?.use { input ->
                    source.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected file")
                val destination = File(cacheDir, "pptx_compress_out_${System.currentTimeMillis()}.pptx")
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
                    compressDestinationLauncher.launch("compressed.pptx")
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

    // --- Slide edits ---

    private fun addSlide() {
        val presentation = presentation ?: return
        presentation.slides.add(PptxEngine.Slide("", ""))
        adapter.submit(presentation.slides)
        recycler.scrollToPosition(presentation.slides.size - 1)
    }

    private fun moveSlide(from: Int, to: Int) {
        val presentation = presentation ?: return
        if (to !in presentation.slides.indices) return
        val slide = presentation.slides.removeAt(from)
        presentation.slides.add(to, slide)
        adapter.submit(presentation.slides)
    }

    private fun deleteSlide(index: Int) {
        val presentation = presentation ?: return
        if (index !in presentation.slides.indices) return
        presentation.slides.removeAt(index)
        if (presentation.slides.isEmpty()) presentation.slides.add(PptxEngine.Slide("", ""))
        adapter.submit(presentation.slides)
    }

    // --- Shared plumbing ---

    private fun applyPresentation(p: PptxEngine.Presentation) {
        presentation = p
        adapter.submit(p.slides)
        updateButtonsEnabled()
    }

    private fun updateButtonsEnabled() {
        saveButton.isEnabled = presentation != null
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
