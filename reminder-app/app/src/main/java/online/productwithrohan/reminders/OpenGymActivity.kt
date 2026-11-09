package online.productwithrohan.reminders

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import java.io.ByteArrayInputStream
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors

/**
 * The "Open Gym" section: openGym (github.com/DuarteSantos8/openGym, AGPL-3.0),
 * an open-source gym tracker, hosted entirely inside this app. Its phone
 * flavour is built into `assets/opengym/` at build time
 * (`reminder-app/opengym/build.sh`) and served to a WebView from a fixed
 * https origin by [shouldInterceptRequest] below — no server, no account, the
 * training log never leaves the phone. See `reminder-app/opengym/README.md`
 * for what is patched (a suggested session for every weekday, among others)
 * and for the licence terms that come with shipping it.
 *
 * openGym keeps its state in the WebView's localStorage, which Android's
 * backup does not cover. `host-bridge.js` (injected into the bundle) mirrors
 * it through [HostBridge] into `files/opengym_state.json`, which the backup
 * rules do list, and restores it when localStorage comes up empty.
 */
class OpenGymActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val stateLock = Any()
    private val stateFile by lazy { File(filesDir, STATE_FILE) }

    private var webView: WebView? = null
    private lateinit var progress: ProgressBar

    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingSave: String? = null

    private val fileChooser =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            fileCallback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            )
            fileCallback = null
        }

    private val saveDocument =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val text = pendingSave
            pendingSave = null
            val uri = result.data?.data
            if (result.resultCode != Activity.RESULT_OK || uri == null || text == null) return@registerForActivityResult
            executor.execute {
                val ok = try {
                    contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) } != null
                } catch (e: Exception) {
                    false
                }
                runOnUiThread {
                    Toast.makeText(
                        this,
                        if (ok) R.string.open_gym_export_saved else R.string.open_gym_export_failed,
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_open_gym)
        // openGym draws its own header and tab bar; a second title bar on top wastes a row.
        supportActionBar?.hide()
        window.statusBarColor = BACKGROUND
        window.navigationBarColor = BACKGROUND
        // Light icons on that dark bar, whatever the app's own day/night theme says.
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }

        progress = findViewById(R.id.progress)
        val web = findViewById<WebView>(R.id.web_view)
        val missing = findViewById<TextView>(R.id.missing_text)

        if (!bundlePresent()) {
            // A build made without the buildOpenGym step (no Node on the build machine).
            web.visibility = View.GONE
            progress.visibility = View.GONE
            missing.visibility = View.VISIBLE
            return
        }
        webView = web

        web.setBackgroundColor(BACKGROUND)
        web.settings.apply {
            javaScriptEnabled = true
            // The training log lives in localStorage, custom media in IndexedDB.
            domStorageEnabled = true
            databaseEnabled = true
            // Rest-timer beeps fire from a timer, not from a tap.
            mediaPlaybackRequiresUserGesture = false
            // The bundle changes with the APK, never behind the same URL at runtime.
            cacheMode = WebSettings.LOAD_NO_CACHE
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
        }
        web.addJavascriptInterface(HostBridge(), BRIDGE_NAME)

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val url = request.url
                // Anything else (a server the user chose to connect to, their own
                // AI-coach provider) goes out normally; the app itself is all local.
                if (url.host != APP_HOST) return null
                return assetResponse(url.path.orEmpty())
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == APP_HOST) return false
                // The bridge is only ever exposed to the bundled app: an outside
                // link (docs, a YouTube demo) opens in the browser instead.
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                } catch (e: Exception) {
                    // No app for it: nothing to do.
                }
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            // <input type="file">: restoring a backup, importing from another app,
            // a photo for a custom exercise.
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    fileChooser.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    fileCallback = null
                    false
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // openGym decides: close a sheet, go back a page, or (second press
                // on a root tab) leave through HostBridge.exit().
                web.evaluateJavascript(
                    "(function(){if(window.__openGymBack){window.__openGymBack();return 'handled'}return 'none'})()"
                ) { result ->
                    if (result?.contains("handled") != true) {
                        if (web.canGoBack()) web.goBack() else finish()
                    }
                }
            }
        })

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(START_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView?.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
    }

    override fun onPause() {
        // Leaving the screen is the moment a copy matters most.
        webView?.evaluateJavascript("window.__openGymMirror && window.__openGymMirror()", null)
        webView?.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        webView?.let {
            it.removeJavascriptInterface(BRIDGE_NAME)
            it.destroy()
        }
        webView = null
        executor.shutdown()
        super.onDestroy()
    }

    private fun bundlePresent(): Boolean = try {
        assets.open("$ASSET_DIR/index.html").close()
        true
    } catch (e: IOException) {
        false
    }

    /** Serves `https://APP_HOST/<path>` from `assets/opengym/<path>`. */
    private fun assetResponse(rawPath: String): WebResourceResponse {
        val path = rawPath.trimStart('/').ifEmpty { "index.html" }
        if (path.split('/').any { it == ".." }) return notFound()
        val ext = path.substringAfterLast('.', "").lowercase()
        val mime = MIME_TYPES[ext] ?: "application/octet-stream"
        val textual = mime.startsWith("text/") || mime == "application/json" || mime == "image/svg+xml"
        return try {
            WebResourceResponse(mime, if (textual) "utf-8" else null, assets.open("$ASSET_DIR/$path"))
        } catch (e: IOException) {
            // Notably every /exercise-media/ request: the licensed pictures are
            // not bundled (see the README), and openGym falls back to a placeholder.
            notFound()
        }
    }

    private fun notFound() = WebResourceResponse(
        "text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0))
    )

    /** `window.OpenGymHost` in the page. Called on WebView's own bridge thread. */
    private inner class HostBridge {

        @JavascriptInterface
        fun loadState(): String = synchronized(stateLock) {
            try {
                if (stateFile.exists()) stateFile.readText(Charsets.UTF_8) else ""
            } catch (e: Exception) {
                ""
            }
        }

        @JavascriptInterface
        fun saveState(json: String) {
            // A state document is a JSON object; never replace the kept copy with anything else.
            if (!json.trimStart().startsWith("{")) return
            synchronized(stateLock) {
                try {
                    // Whole file first, then swapped in, so a write cut short never
                    // leaves half a training log where the last good copy was.
                    val tmp = File(filesDir, "$STATE_FILE.tmp")
                    tmp.writeText(json, Charsets.UTF_8)
                    if (!tmp.renameTo(stateFile)) {
                        stateFile.writeText(json, Charsets.UTF_8)
                        tmp.delete()
                    }
                } catch (e: Exception) {
                    // localStorage still has it; the next change tries again.
                }
            }
        }

        /** openGym's "Export": hand the text to Android's "save to" picker. */
        @JavascriptInterface
        fun saveText(filename: String, text: String) {
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                pendingSave = text
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = if (filename.endsWith(".csv", ignoreCase = true)) "text/csv" else "application/json"
                    putExtra(Intent.EXTRA_TITLE, filename)
                }
                try {
                    saveDocument.launch(intent)
                } catch (e: Exception) {
                    pendingSave = null
                    Toast.makeText(this@OpenGymActivity, R.string.open_gym_export_failed, Toast.LENGTH_SHORT).show()
                }
            }
        }

        /** Back pressed twice on one of openGym's root tabs. */
        @JavascriptInterface
        fun exit() {
            runOnUiThread { finish() }
        }
    }

    companion object {
        private const val ASSET_DIR = "opengym"
        private const val STATE_FILE = "opengym_state.json"
        private const val BRIDGE_NAME = "OpenGymHost"

        // The host Google reserves for exactly this (androidx.webkit's
        // WebViewAssetLoader uses it too): nothing real ever answers for it, and
        // https makes the page a secure context (crypto, storage, clipboard).
        // Changing it orphans everything openGym stored under the old origin.
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val START_URL = "https://$APP_HOST/index.html"

        // openGym's own page background (capacitor.config.json backgroundColor).
        private val BACKGROUND = Color.parseColor("#0c0e12")

        private val MIME_TYPES = mapOf(
            "html" to "text/html",
            "js" to "text/javascript",
            "mjs" to "text/javascript",
            "css" to "text/css",
            "json" to "application/json",
            "txt" to "text/plain",
            "md" to "text/plain",
            "svg" to "image/svg+xml",
            "png" to "image/png",
            "jpg" to "image/jpeg",
            "jpeg" to "image/jpeg",
            "webp" to "image/webp",
            "gif" to "image/gif",
            "ico" to "image/x-icon",
            "woff" to "font/woff",
            "woff2" to "font/woff2",
            "ttf" to "font/ttf",
            "mp3" to "audio/mpeg",
            "wav" to "audio/wav",
            "ogg" to "audio/ogg",
            "mp4" to "video/mp4",
            "wasm" to "application/wasm"
        )
    }
}
