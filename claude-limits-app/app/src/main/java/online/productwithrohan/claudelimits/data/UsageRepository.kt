package online.productwithrohan.claudelimits.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/** Outcome of a refresh, as the widget and UI need to distinguish it. */
sealed interface FetchResult {
    data class Success(val snapshot: UsageSnapshot) : FetchResult

    /** Session is dead — the widget switches to "Tap to sign in". */
    data object NeedsLogin : FetchResult

    /** Transient. The last good snapshot stays on screen, labelled with its age. */
    data class Soft(val reason: String) : FetchResult
}

/**
 * Fetches the usage snapshot and persists it.
 *
 * A 403 is treated as a stale Cloudflare clearance rather than a failure: the
 * off-screen challenge runs once and the request is retried. Only a rejected
 * session cookie escalates to [FetchResult.NeedsLogin].
 */
class UsageRepository(private val context: Context) {

    private val store = Store.get(context)

    suspend fun refresh(): FetchResult = withContext(Dispatchers.IO) {
        if (!store.isSignedIn) return@withContext FetchResult.NeedsLogin

        val organizationId = store.organizationId
            ?: discoverOrganizationId()?.also { store.organizationId = it }
            ?: return@withContext FetchResult.Soft("organization-unknown")

        val result = when (val first = fetchUsage(organizationId)) {
            is FetchResult.Soft ->
                if (first.reason == CHALLENGED) retryAfterChallenge(organizationId) else first
            else -> first
        }

        store.authState = if (result is FetchResult.NeedsLogin) {
            AuthState.NEEDS_LOGIN
        } else {
            AuthState.OK
        }
        if (result is FetchResult.Success) store.saveSnapshot(result.snapshot)

        result
    }

    private suspend fun retryAfterChallenge(organizationId: String): FetchResult =
        if (CloudflareRefresher.refresh(context, store)) {
            fetchUsage(organizationId)
        } else {
            FetchResult.Soft("cloudflare-unresolved")
        }

    private fun fetchUsage(organizationId: String): FetchResult =
        when (val outcome = UsageClient.get(Endpoints.usage(organizationId), store)) {
            is HttpOutcome.Body -> try {
                FetchResult.Success(UsageSnapshot.parse(outcome.text, System.currentTimeMillis()))
            } catch (e: Exception) {
                // A shape change should not look like a dead session.
                FetchResult.Soft("unparseable: ${e.message}")
            }

            HttpOutcome.Unauthorized -> FetchResult.NeedsLogin
            HttpOutcome.Challenged -> FetchResult.Soft(CHALLENGED)
            is HttpOutcome.Failed -> FetchResult.Soft(outcome.reason)
        }

    /**
     * Resolves which organization to ask about. Accounts usually have exactly
     * one; where there are several, prefer the one that looks like the Claude
     * subscription rather than an API-only org.
     */
    private fun discoverOrganizationId(): String? {
        val outcome = UsageClient.get(Endpoints.ORGANIZATIONS, store)
        if (outcome !is HttpOutcome.Body) return null

        return try {
            val organizations = JSONArray(outcome.text)
            if (organizations.length() == 0) return null

            for (index in 0 until organizations.length()) {
                val organization = organizations.getJSONObject(index)
                val capabilities = organization.optJSONArray("capabilities") ?: continue
                val looksLikeClaude = (0 until capabilities.length()).any {
                    val capability = capabilities.optString(it)
                    capability.contains("chat", ignoreCase = true) ||
                        capability.contains("claude_ai", ignoreCase = true)
                }
                if (looksLikeClaude) return organization.identifier()
            }

            organizations.getJSONObject(0).identifier()
        } catch (_: Exception) {
            null
        }
    }

    private fun JSONObject.identifier(): String? =
        optString("uuid").ifBlank { optString("id") }.ifBlank { null }

    private companion object {
        const val CHALLENGED = "cloudflare"
    }
}
