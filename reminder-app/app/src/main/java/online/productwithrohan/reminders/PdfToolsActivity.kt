package online.productwithrohan.reminders

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.multipdf.PDFMergerUtility
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.graphics.image.JPEGFactory
import com.tom_roush.pdfbox.pdmodel.graphics.image.PDImageXObject
import java.io.File
import java.util.concurrent.Executors

/**
 * Open-source PDF tools: view, create from photos, merge, rotate/delete/reorder
 * pages, compress, save. Built on PdfBox-Android; PdfRenderer (built into
 * Android) draws the page thumbnails.
 *
 * The working document lives in memory as a [PDDocument]. Any structural
 * change re-saves it to a fresh cache file and re-renders thumbnails from
 * that file, mirroring ZipExtractorActivity's "operate on a real File, not
 * directly on the SAF stream" shape.
 */
class PdfToolsActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var pageCountText: TextView
    private lateinit var statusText: TextView
    private lateinit var progress: ProgressBar
    private lateinit var recycler: RecyclerView
    private lateinit var adapter: PdfPageAdapter
    private lateinit var saveButton: Button
    private lateinit var compressButton: Button

    private var document: PDDocument? = null
    private var renderer: PdfRenderer? = null
    private var pfd: ParcelFileDescriptor? = null
    private var workingFile: File? = null
    private var busy = false

    private val openPdfLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) loadFromUri(uri)
        }

    private val pickPhotosLauncher =
        registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
            if (uris.isNotEmpty()) createFromPhotos(uris)
        }

    private val mergeLauncher =
        registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
            if (uris.size < 2) {
                if (uris.isNotEmpty()) Toast.makeText(this, R.string.pdf_merge_need_two, Toast.LENGTH_SHORT).show()
            } else {
                mergeAll(uris)
            }
        }

    private val saveAsLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
            if (uri != null) saveTo(uri)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        PDFBoxResourceLoader.init(applicationContext)
        setContentView(R.layout.activity_pdf_tools)
        title = getString(R.string.works_enabler_pdf_title)

        pageCountText = findViewById(R.id.page_count)
        statusText = findViewById(R.id.status_text)
        progress = findViewById(R.id.progress)
        recycler = findViewById(R.id.recycler_pages)
        saveButton = findViewById(R.id.button_save_as)
        compressButton = findViewById(R.id.button_compress)

        adapter = PdfPageAdapter(
            onRotate = { index -> rotatePage(index) },
            onDelete = { index -> deletePage(index) },
            onMoveUp = { index -> movePage(index, index - 1) },
            onMoveDown = { index -> movePage(index, index + 1) },
        )
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<Button>(R.id.button_open).setOnClickListener {
            if (!busy) openPdfLauncher.launch(arrayOf("application/pdf"))
        }
        findViewById<Button>(R.id.button_new_from_photos).setOnClickListener {
            if (!busy) pickPhotosLauncher.launch(arrayOf("image/*"))
        }
        findViewById<Button>(R.id.button_merge).setOnClickListener {
            if (!busy) mergeLauncher.launch(arrayOf("application/pdf"))
        }
        saveButton.setOnClickListener {
            if (!busy) saveAsLauncher.launch("document.pdf")
        }
        compressButton.setOnClickListener { if (!busy) compress() }

        updateButtonsEnabled()
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
        closeRenderer()
        document?.close()
        workingFile?.delete()
    }

    // --- Loading / creating / merging (each produces a brand-new PDDocument) ---

    private fun loadFromUri(uri: Uri) = runDocumentTask {
        val temp = copyToCache(uri, "pdf_source")
        val doc = PDDocument.load(temp)
        temp.delete()
        doc
    }

    private fun createFromPhotos(uris: List<Uri>) = runDocumentTask {
        val doc = PDDocument()
        for (uri in uris) {
            val bitmap = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) } ?: continue
            addImagePage(doc, bitmap)
            bitmap.recycle()
        }
        doc
    }

    private fun mergeAll(uris: List<Uri>) = runDocumentTask {
        val files = uris.map { copyToCache(it, "pdf_merge") }
        val destination = PDDocument.load(files[0])
        val merger = PDFMergerUtility()
        for (i in 1 until files.size) {
            val source = PDDocument.load(files[i])
            merger.appendDocument(destination, source)
            source.close()
        }
        files.forEach { it.delete() }
        destination
    }

    private fun addImagePage(doc: PDDocument, bitmap: Bitmap) {
        val box = PDRectangle.A4
        val page = PDPage(box)
        doc.addPage(page)
        val scale = minOf(box.width / bitmap.width, box.height / bitmap.height)
        val drawWidth = bitmap.width * scale
        val drawHeight = bitmap.height * scale
        val x = (box.width - drawWidth) / 2f
        val y = (box.height - drawHeight) / 2f
        val image = JPEGFactory.createFromImage(doc, bitmap, 0.85f)
        PDPageContentStream(doc, page).use { cs -> cs.drawImage(image, x, y, drawWidth, drawHeight) }
    }

    // --- Page-level edits (mutate the existing PDDocument in place) ---

    private fun rotatePage(index: Int) {
        val doc = document ?: return
        if (busy) return
        val page = doc.getPage(index)
        page.rotation = (page.rotation + 90) % 360
        runDocumentTask(showBusy = false) { doc }
    }

    private fun deletePage(index: Int) {
        val doc = document ?: return
        if (busy) return
        doc.removePage(index)
        runDocumentTask(showBusy = false) { doc }
    }

    private fun movePage(from: Int, to: Int) {
        val doc = document ?: return
        if (busy || to < 0 || to >= doc.numberOfPages) return
        runDocumentTask {
            val order = (0 until doc.numberOfPages).toMutableList()
            order.add(to, order.removeAt(from))
            val rebuilt = PDDocument()
            for (i in order) rebuilt.importPage(doc.getPage(i))
            doc.close()
            rebuilt
        }
    }

    private fun compress() {
        val doc = document ?: return
        val beforeSize = workingFile?.length() ?: 0L
        pendingCompressBeforeSize = beforeSize
        runDocumentTask {
            for (i in 0 until doc.numberOfPages) compressPageImages(doc, doc.getPage(i))
            doc
        }
    }

    private var pendingCompressBeforeSize: Long? = null

    private fun compressPageImages(doc: PDDocument, page: PDPage) {
        val resources = page.resources ?: return
        for (name in resources.xObjectNames.toList()) {
            if (!resources.isImageXObject(name)) continue
            val image = resources.getXObject(name) as? PDImageXObject ?: continue
            val bitmap = image.image
            val recompressed = JPEGFactory.createFromImage(doc, bitmap, 0.5f)
            resources.put(name, recompressed)
        }
    }

    // --- Saving ---

    private fun saveTo(uri: Uri) {
        val doc = document ?: return
        if (busy) return
        setBusy(true, null)
        executor.execute {
            try {
                contentResolver.openOutputStream(uri)?.use { out -> doc.save(out) }
                    ?: throw IllegalStateException("could not open the destination")
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.pdf_saved)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.pdf_save_failed, e.message ?: e.toString())
                }
            }
        }
    }

    // --- Shared plumbing ---

    private fun copyToCache(uri: Uri, prefix: String): File {
        val file = File(cacheDir, "${prefix}_${System.currentTimeMillis()}_${(0..9999).random()}.pdf")
        contentResolver.openInputStream(uri)?.use { input ->
            file.outputStream().use { output -> input.copyTo(output) }
        } ?: throw IllegalStateException("could not open the selected file")
        return file
    }

    /**
     * Runs [produceDoc] off the main thread, then rebuilds page thumbnails from
     * the result and applies everything on the main thread. Used both for
     * operations that create a new [PDDocument] (open/create/merge/reorder) and
     * ones that mutate the existing one in place (rotate/delete/compress) —
     * [applyDocument] only closes the old document if [produceDoc] returned a
     * different instance.
     */
    private fun runDocumentTask(showBusy: Boolean = true, produceDoc: () -> PDDocument) {
        if (showBusy) setBusy(true, R.string.pdf_loading)
        val previousStatus = statusText.text
        executor.execute {
            try {
                val newDoc = produceDoc()
                val state = if (newDoc.numberOfPages > 0) buildRenderState(newDoc) else null
                mainHandler.post {
                    applyDocument(newDoc, state)
                    setBusy(false, null)
                    val compressBefore = pendingCompressBeforeSize
                    when {
                        compressBefore != null -> {
                            pendingCompressBeforeSize = null
                            val after = workingFile?.length() ?: 0L
                            statusText.text = getString(R.string.pdf_compress_done, formatSize(compressBefore), formatSize(after))
                        }
                        state == null -> statusText.text = getString(R.string.pdf_no_pages_left)
                        else -> statusText.text = previousStatus
                    }
                }
            } catch (e: Exception) {
                mainHandler.post {
                    pendingCompressBeforeSize = null
                    setBusy(false, null)
                    statusText.text = getString(R.string.pdf_open_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private class RenderState(
        val file: File,
        val pfd: ParcelFileDescriptor,
        val renderer: PdfRenderer,
        val thumbnails: List<Bitmap>,
        val pageCount: Int,
    )

    /** Must be called off the main thread: saves to a fresh cache file and renders every page. */
    private fun buildRenderState(doc: PDDocument): RenderState {
        val file = File(cacheDir, "pdf_working_${System.currentTimeMillis()}.pdf")
        doc.save(file)
        val newPfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val newRenderer = PdfRenderer(newPfd)
        val thumbnails = ArrayList<Bitmap>(newRenderer.pageCount)
        for (i in 0 until newRenderer.pageCount) {
            newRenderer.openPage(i).use { page ->
                val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
                bitmap.eraseColor(Color.WHITE)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                thumbnails.add(bitmap)
            }
        }
        return RenderState(file, newPfd, newRenderer, thumbnails, newRenderer.pageCount)
    }

    /** Main thread only. */
    private fun applyDocument(doc: PDDocument, state: RenderState?) {
        val old = document
        if (old != null && old !== doc) old.close()
        document = doc

        closeRenderer()
        workingFile?.delete()

        if (state != null) {
            workingFile = state.file
            pfd = state.pfd
            renderer = state.renderer
            adapter.submit(state.thumbnails)
            pageCountText.text = getString(R.string.pdf_page_count, state.pageCount)
        } else {
            workingFile = null
            adapter.submit(emptyList())
            pageCountText.text = getString(R.string.pdf_no_file_chosen)
        }
        updateButtonsEnabled()
    }

    private fun closeRenderer() {
        renderer?.close()
        renderer = null
        pfd?.close()
        pfd = null
    }

    private fun updateButtonsEnabled() {
        val hasDoc = (document?.numberOfPages ?: 0) > 0
        saveButton.isEnabled = hasDoc
        compressButton.isEnabled = hasDoc
    }

    private fun setBusy(isBusy: Boolean, statusRes: Int?) {
        busy = isBusy
        progress.visibility = if (isBusy) android.view.View.VISIBLE else android.view.View.GONE
        statusRes?.let { statusText.text = getString(it) }
    }

    private fun formatSize(bytes: Long): String {
        val kb = bytes / 1024.0
        return if (kb < 1024) String.format("%.0f KB", kb) else String.format("%.1f MB", kb / 1024)
    }
}
