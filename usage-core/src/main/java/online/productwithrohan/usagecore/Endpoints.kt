package online.productwithrohan.usagecore

/**
 * The claude.ai endpoints and cookie names this app depends on.
 *
 * Anthropic publishes no API for subscription usage limits, so there is nothing
 * official to call here. This is the same request the usage page makes in a
 * browser, replayed with the session cookies harvested from the in-app WebView
 * login. It is undocumented and can change without notice — every caller must
 * degrade gracefully rather than assume a shape.
 */
object Endpoints {

    const val BASE = "https://claude.ai"

    /** Where the user signs in; the WebView cookie jar is read afterwards. */
    const val LOGIN = "$BASE/login"

    /**
     * Loaded in an off-screen WebView to let Cloudflare's JavaScript challenge
     * mint a fresh clearance cookie without the user seeing anything.
     */
    const val CHALLENGE = "$BASE/new"

    const val ORGANIZATIONS = "$BASE/api/organizations"

    fun usage(organizationId: String) = "$BASE/api/organizations/$organizationId/usage"
}

object Cookies {
    const val SESSION = "sessionKey"
    const val CLEARANCE = "cf_clearance"
    const val LAST_ORG = "lastActiveOrg"
}
