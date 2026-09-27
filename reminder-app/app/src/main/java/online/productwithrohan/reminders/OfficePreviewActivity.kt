package online.productwithrohan.reminders

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.documentfile.provider.DocumentFile
import java.util.concurrent.Executors

/**
 * Read-only viewer that shows a .docx/.pptx/.xlsx roughly the way Office
 * draws it — page layout, fonts, colours, tables, images, slide shapes,
 * cell styling — unlike the text-only editors ([DocxEditorActivity] etc.).
 *
 * Rendering is done by bundled JavaScript libraries in a WebView, entirely
 * offline (`assets/office_viewer/`): docx-preview (Apache-2.0) for Word,
 * pptx-preview (ISC; free incl. commercial use, but its source isn't
 * published — only the minified npm build) for PowerPoint, and ExcelJS (MIT)
 * plus our own table renderer for Excel. Network loads are blocked, and the
 * only JS bridge is [ViewerBridge], which hands over this one file's bytes.
 *
 * It is the "Open with" target for those three types (see the manifest);
 * "Edit text" hands the same file to the matching text editor.
 */
class OfficePreviewActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var editButton: Button

    private var currentUri: Uri? = null
    private var currentKind: String? = null

    private val pickLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) show(uri, null)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_office_preview)
        title = getString(R.string.office_viewer_title)

        webView = findViewById(R.id.web_view)
        progress = findViewById(R.id.progress)
        statusText = findViewById(R.id.status_text)
        editButton = findViewById(R.id.button_edit_text)

        webView.settings.apply {
            javaScriptEnabled = true
            blockNetworkLoads = true
            allowContentAccess = false
            // file:///android_asset stays readable regardless of this.
            allowFileAccess = false
            builtInZoomControls = true
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = false
        }
        webView.webViewClient = object : WebViewClient() {
            // Never navigate away from the bundled viewer page.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
        }

        findViewById<Button>(R.id.button_open_other).setOnClickListener {
            pickLauncher.launch(arrayOf(DOCX_MIME, PPTX_MIME, XLSX_MIME))
        }
        editButton.setOnClickListener { openInEditor() }
        editButton.isEnabled = false

        val incoming = intent?.data
        if (savedInstanceState == null && intent?.action == Intent.ACTION_VIEW && incoming != null) {
            show(incoming, intent.type)
        } else {
            statusText.text = getString(R.string.office_viewer_pick_prompt)
            pickLauncher.launch(arrayOf(DOCX_MIME, PPTX_MIME, XLSX_MIME))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
        webView.removeJavascriptInterface(BRIDGE_NAME)
        webView.destroy()
    }

    private fun show(uri: Uri, typeHint: String?) {
        val name = DocumentFile.fromSingleUri(this, uri)?.name
        val kind = kindFor(typeHint ?: contentResolver.getType(uri), name)
        if (kind == null) {
            statusText.text = getString(R.string.office_viewer_unsupported)
            return
        }
        currentUri = uri
        currentKind = kind
        editButton.isEnabled = false
        name?.let { title = it }
        progress.visibility = View.VISIBLE
        statusText.text = getString(R.string.office_viewer_loading)
        executor.execute {
            try {
                val bytes = contentResolver.openInputStream(uri)?.use { input ->
                    val limited = input.readBytesLimited(MAX_BYTES)
                        ?: throw IllegalStateException(getString(R.string.office_viewer_too_large, MAX_BYTES / (1024 * 1024)))
                    limited
                } ?: throw IllegalStateException("could not open the selected file")
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                mainHandler.post { loadViewer(kind, base64) }
            } catch (e: Exception) {
                mainHandler.post {
                    progress.visibility = View.GONE
                    statusText.text = getString(R.string.office_viewer_failed, e.message ?: e.toString())
                }
            }
        }
    }

    private fun loadViewer(kind: String, base64: String) {
        webView.removeJavascriptInterface(BRIDGE_NAME)
        webView.addJavascriptInterface(ViewerBridge(kind, base64), BRIDGE_NAME)
        webView.loadUrl("file:///android_asset/office_viewer/index.html")
    }

    private fun openInEditor() {
        val uri = currentUri ?: return
        val target = when (currentKind) {
            "docx" -> DocxEditorActivity::class.java
            "pptx" -> PptxEditorActivity::class.java
            "xlsx" -> SpreadsheetActivity::class.java
            else -> return
        }
        startActivity(
            Intent(this, target)
                .setAction(Intent.ACTION_VIEW)
                .setData(uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        )
    }

    /** Called by the page from the WebView's JS thread. */
    private inner class ViewerBridge(private val kind: String, private val data: String) {
        @JavascriptInterface fun getKind(): String = kind
        @JavascriptInterface fun getData(): String = data
        @JavascriptInterface fun onDone() {
            mainHandler.post {
                progress.visibility = View.GONE
                statusText.text = getString(R.string.office_viewer_hint)
                editButton.isEnabled = true
            }
        }
        @JavascriptInterface fun onError(message: String) {
            mainHandler.post {
                progress.visibility = View.GONE
                statusText.text = getString(R.string.office_viewer_failed, message)
                editButton.isEnabled = true
            }
        }
    }

    companion object {
        private const val BRIDGE_NAME = "AndroidViewer"
        /** Base64 inflates by a third and the page decodes it again; keep it phone-sized. */
        private const val MAX_BYTES = 25 * 1024 * 1024
        private const val DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        private const val PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        private const val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        fun kindFor(mime: String?, name: String?): String? {
            when (mime) {
                DOCX_MIME -> return "docx"
                PPTX_MIME -> return "pptx"
                XLSX_MIME -> return "xlsx"
            }
            val lower = name?.lowercase() ?: return null
            return when {
                lower.endsWith(".docx") -> "docx"
                lower.endsWith(".pptx") -> "pptx"
                lower.endsWith(".xlsx") -> "xlsx"
                else -> null
            }
        }

        /** Reads the whole stream, or returns null once it exceeds [limit] bytes. */
        private fun java.io.InputStream.readBytesLimited(limit: Int): ByteArray? {
            val out = java.io.ByteArrayOutputStream()
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val n = read(buffer)
                if (n < 0) break
                if (out.size() + n > limit) return null
                out.write(buffer, 0, n)
            }
            return out.toByteArray()
        }
    }
}
