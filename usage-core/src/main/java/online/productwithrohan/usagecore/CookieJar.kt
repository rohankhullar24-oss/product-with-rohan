package online.productwithrohan.usagecore

import android.webkit.CookieManager

/**
 * Moves the claude.ai cookies the WebView holds into [Store].
 *
 * The WebView owns the cookie jar for both sign-in and the Cloudflare
 * challenge; the plain HTTP client that fetches usage does not share it, so
 * the values have to be copied across explicitly.
 */
object CookieJar {

    /** @return true if a session cookie was present and stored. */
    fun harvestInto(store: Store): Boolean {
        val raw = CookieManager.getInstance().getCookie(Endpoints.BASE) ?: return false
        val cookies = parse(raw)

        val session = cookies[Cookies.SESSION]
        if (!session.isNullOrBlank()) store.sessionKey = session

        val clearance = cookies[Cookies.CLEARANCE]
        if (!clearance.isNullOrBlank()) store.clearance = clearance

        // Saves a round trip to the organizations endpoint when it's present.
        if (store.organizationId.isNullOrBlank()) {
            cookies[Cookies.LAST_ORG]?.takeIf { it.isNotBlank() }?.let { store.organizationId = it }
        }

        return !session.isNullOrBlank()
    }

    /** Puts our session cookie into the WebView jar before an off-screen load. */
    fun seedSession(store: Store) {
        val session = store.sessionKey ?: return
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setCookie(Endpoints.BASE, "${Cookies.SESSION}=$session; Domain=.claude.ai; Path=/")
        }
    }

    private fun parse(raw: String): Map<String, String> = raw.split(';').mapNotNull { part ->
        val separator = part.indexOf('=')
        if (separator <= 0) return@mapNotNull null
        part.substring(0, separator).trim() to part.substring(separator + 1).trim()
    }.toMap()
}
