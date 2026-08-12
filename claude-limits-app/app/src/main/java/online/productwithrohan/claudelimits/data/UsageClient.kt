package online.productwithrohan.claudelimits.data

import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/** What a single request to claude.ai told us. */
sealed interface HttpOutcome {
    data class Body(val text: String) : HttpOutcome

    /** The session cookie is gone or rejected — only a fresh login fixes this. */
    data object Unauthorized : HttpOutcome

    /** Cloudflare wants a challenge solved; a new clearance cookie may fix it. */
    data object Challenged : HttpOutcome

    /** Transient: no network, server error, anything else. Keep the last snapshot. */
    data class Failed(val reason: String) : HttpOutcome
}

/**
 * Blocking HTTP for the two claude.ai endpoints we read. Uses
 * [HttpsURLConnection] so the module keeps the same zero-dependency networking
 * approach as the reminders app.
 *
 * All methods block — call them from a background thread.
 */
object UsageClient {

    private const val TIMEOUT_MS = 20_000

    fun get(url: String, store: Store): HttpOutcome {
        val session = store.sessionKey ?: return HttpOutcome.Unauthorized
        val connection = try {
            URL(url).openConnection() as HttpsURLConnection
        } catch (e: Exception) {
            return HttpOutcome.Failed(e.message ?: "connect")
        }

        return try {
            connection.requestMethod = "GET"
            connection.connectTimeout = TIMEOUT_MS
            connection.readTimeout = TIMEOUT_MS
            // A redirect to the login page is how a dead session shows up, so it
            // has to stay visible as a 3xx rather than being followed silently.
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "*/*")
            connection.setRequestProperty("Cookie", cookieHeader(session, store.clearance))
            // Must match the agent that solved the challenge or clearance is void.
            store.userAgent?.let { connection.setRequestProperty("User-Agent", it) }

            classify(connection)
        } catch (e: Exception) {
            HttpOutcome.Failed(e.message ?: "io")
        } finally {
            connection.disconnect()
        }
    }

    private fun classify(connection: HttpsURLConnection): HttpOutcome {
        val code = connection.responseCode
        val body = readBody(connection)
        return when {
            code == HttpURLConnection.HTTP_OK -> HttpOutcome.Body(body)

            code == HttpURLConnection.HTTP_UNAUTHORIZED || code in 300..399 ->
                HttpOutcome.Unauthorized

            code == HttpURLConnection.HTTP_FORBIDDEN ||
                code == HttpURLConnection.HTTP_UNAVAILABLE ||
                body.contains("Just a moment") -> HttpOutcome.Challenged

            else -> HttpOutcome.Failed("http-$code")
        }
    }

    private fun readBody(connection: HttpsURLConnection): String = try {
        val stream = if (connection.responseCode in 200..299) {
            connection.inputStream
        } else {
            connection.errorStream
        }
        stream?.bufferedReader()?.use { it.readText() }.orEmpty()
    } catch (_: Exception) {
        ""
    }

    private fun cookieHeader(session: String, clearance: String?): String = buildString {
        append(Cookies.SESSION).append('=').append(session)
        if (!clearance.isNullOrBlank()) {
            append("; ").append(Cookies.CLEARANCE).append('=').append(clearance)
        }
    }
}
