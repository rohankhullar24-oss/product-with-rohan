package online.productwithrohan.usagecore

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * Re-mints the Cloudflare clearance cookie without bothering the user.
 *
 * The clearance cookie is tied to the network path and the browser agent, so it
 * dies routinely — most often when the phone moves between Wi-Fi and cellular.
 * Loading a claude.ai page in an off-screen [WebView] runs Cloudflare's
 * JavaScript challenge and mints a new one. This needs a live session cookie
 * but no interaction; if the session itself is dead, the caller finds out on
 * the next request and sends the user to sign in.
 *
 * WebView is main-thread only, so the work is posted there and awaited.
 */
object CloudflareRefresher {

    private const val TIMEOUT_MS = 30_000L

    /** @return true if a clearance cookie was obtained and stored. */
    suspend fun refresh(context: Context, store: Store): Boolean {
        CookieJar.seedSession(store)

        val solved = withTimeoutOrNull(TIMEOUT_MS) {
            solveChallenge(context.applicationContext, store)
        } ?: false

        return solved && !store.clearance.isNullOrBlank()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private suspend fun solveChallenge(appContext: Context, store: Store): Boolean =
        suspendCancellableCoroutine { continuation ->
            val main = Handler(Looper.getMainLooper())

            main.post {
                val cookieManager = CookieManager.getInstance()
                var settled = false
                var webView: WebView? = null

                fun settle(success: Boolean) {
                    if (settled) return
                    settled = true
                    cookieManager.flush()
                    if (success) CookieJar.harvestInto(store)
                    webView?.stopLoading()
                    webView?.destroy()
                    webView = null
                    if (continuation.isActive) continuation.resume(success)
                }

                webView = WebView(appContext).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    store.userAgent?.let { settings.userAgentString = it }
                    cookieManager.setAcceptCookie(true)
                    cookieManager.setAcceptThirdPartyCookies(this, true)

                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String) {
                            // Cloudflare bounces through several loads; settle on the
                            // first one that leaves a clearance cookie behind, and let
                            // the timeout handle the case where none ever arrives.
                            val cookies = cookieManager.getCookie(Endpoints.BASE).orEmpty()
                            if (cookies.contains("${Cookies.CLEARANCE}=")) settle(true)
                        }
                    }

                    loadUrl(Endpoints.CHALLENGE)
                }

                continuation.invokeOnCancellation {
                    main.post {
                        if (!settled) {
                            settled = true
                            webView?.destroy()
                            webView = null
                        }
                    }
                }
            }
        }
}
