package online.productwithrohan.claudelimits.ui

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import online.productwithrohan.claudelimits.R
import online.productwithrohan.claudelimits.data.AuthState
import online.productwithrohan.claudelimits.data.CookieJar
import online.productwithrohan.claudelimits.data.Endpoints
import online.productwithrohan.claudelimits.data.Store
import online.productwithrohan.claudelimits.work.RefreshScheduler

/**
 * Signs in by letting the user log into claude.ai in a WebView, then copying the
 * resulting cookies out of the WebView jar.
 *
 * This is the whole reason the app needs no computer: the session and the
 * Cloudflare clearance are both minted here, on the phone.
 */
class LoginActivity : AppCompatActivity() {

    private lateinit var store: Store
    private lateinit var webView: WebView
    private var finished = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        store = Store.get(this)
        webView = findViewById(R.id.login_web_view)

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }
        // Everything downstream must replay this exact agent or the Cloudflare
        // clearance minted here will not be honoured.
        store.userAgent = webView.settings.userAgentString

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                CookieManager.getInstance().flush()
                if (CookieJar.harvestInto(store)) completeSignIn()
            }
        }

        if (savedInstanceState == null) {
            webView.loadUrl(Endpoints.LOGIN)
        }
    }

    private fun completeSignIn() {
        if (finished) return
        finished = true

        store.authState = AuthState.OK
        RefreshScheduler.ensureScheduled(this)
        RefreshScheduler.refreshNow(this)

        Toast.makeText(this, R.string.signed_in, Toast.LENGTH_SHORT).show()
        finish()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}
