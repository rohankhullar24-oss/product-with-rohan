package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Minimal Supabase REST client (auth + database) over HttpsURLConnection so the
 * app needs no networking dependencies. The anon key is a public client key;
 * all data access is enforced server-side by row-level security.
 *
 * All methods are blocking — call them from a background thread.
 */
object SupabaseClient {

    private const val SUPABASE_URL = "https://uksoubgwjbgjwtaafdxo.supabase.co"
    private const val ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrc291Ymd3amJnand0YWFmZHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzQwMTQsImV4cCI6MjA5ODcxMDAxNH0.9mUomxEaAfzjDJyQKhE8FKVUnUYEhMWDDkwPGQzNN-c"

    private const val PREFS = "supabase_session"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isSignedIn(context: Context): Boolean =
        prefs(context).getString("refresh_token", null) != null

    fun userEmail(context: Context): String? =
        prefs(context).getString("email", null)

    fun userId(context: Context): String? =
        prefs(context).getString("user_id", null)

    fun lastSyncAt(context: Context): Long = prefs(context).getLong("last_sync_at", 0L)

    fun setLastSyncAt(context: Context, millis: Long) {
        prefs(context).edit().putLong("last_sync_at", millis).apply()
    }

    fun signOut(context: Context) {
        prefs(context).edit().clear().apply()
    }

    /** Sends a 6-digit login code (or magic link) to the address. */
    fun requestOtp(email: String) {
        val body = JSONObject().put("email", email).put("create_user", true)
        val (code, resp) = request("POST", "$SUPABASE_URL/auth/v1/otp", body.toString(), null)
        if (code !in 200..299) throw IOException("OTP request failed ($code): $resp")
    }

    /** Verifies the emailed code and stores the session. */
    fun verifyOtp(context: Context, email: String, token: String) {
        val body = JSONObject()
            .put("type", "email")
            .put("email", email)
            .put("token", token)
        val (code, resp) = request("POST", "$SUPABASE_URL/auth/v1/verify", body.toString(), null)
        if (code !in 200..299) throw IOException("Verification failed ($code): $resp")
        saveSession(context, JSONObject(resp), email)
    }

    private fun saveSession(context: Context, session: JSONObject, emailFallback: String?) {
        val user = session.optJSONObject("user")
        prefs(context).edit()
            .putString("access_token", session.getString("access_token"))
            .putString("refresh_token", session.getString("refresh_token"))
            .putLong(
                "expires_at",
                System.currentTimeMillis() + session.optLong("expires_in", 3600) * 1000L
            )
            .putString("user_id", user?.optString("id") ?: prefs(context).getString("user_id", null))
            .putString("email", user?.optString("email").takeUnless { it.isNullOrBlank() } ?: emailFallback)
            .apply()
    }

    /** Returns a valid access token, refreshing it if it's about to expire. */
    private fun accessToken(context: Context): String {
        val p = prefs(context)
        val token = p.getString("access_token", null) ?: throw IOException("Not signed in")
        val expiresAt = p.getLong("expires_at", 0L)
        if (System.currentTimeMillis() < expiresAt - 60_000L) return token
        val refresh = p.getString("refresh_token", null) ?: throw IOException("Not signed in")
        val body = JSONObject().put("refresh_token", refresh)
        val (code, resp) = request(
            "POST", "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token", body.toString(), null
        )
        if (code !in 200..299) throw IOException("Session refresh failed ($code): $resp")
        saveSession(context, JSONObject(resp), null)
        return prefs(context).getString("access_token", null) ?: throw IOException("Not signed in")
    }

    /** All of this user's reminder rows, including tombstones. */
    fun fetchReminderRows(context: Context): JSONArray {
        val token = accessToken(context)
        val (code, resp) = request(
            "GET", "$SUPABASE_URL/rest/v1/reminders?select=id,payload,updated_at,deleted", null, token
        )
        if (code !in 200..299) throw IOException("Fetch failed ($code): $resp")
        return JSONArray(resp)
    }

    /** Upserts rows (insert or overwrite by primary key). */
    fun upsertReminderRows(context: Context, rows: JSONArray) {
        if (rows.length() == 0) return
        val token = accessToken(context)
        val (code, resp) = request(
            "POST", "$SUPABASE_URL/rest/v1/reminders", rows.toString(), token,
            mapOf("Prefer" to "resolution=merge-duplicates,return=minimal")
        )
        if (code !in 200..299) throw IOException("Push failed ($code): $resp")
    }

    /** All of this user's journal rows, including tombstones. */
    fun fetchJournalRows(context: Context): JSONArray {
        val token = accessToken(context)
        val (code, resp) = request(
            "GET", "$SUPABASE_URL/rest/v1/journal_entries?select=id,payload,updated_at,deleted", null, token
        )
        if (code !in 200..299) throw IOException("Fetch failed ($code): $resp")
        return JSONArray(resp)
    }

    /** Upserts journal rows (insert or overwrite by primary key). */
    fun upsertJournalRows(context: Context, rows: JSONArray) {
        if (rows.length() == 0) return
        val token = accessToken(context)
        val (code, resp) = request(
            "POST", "$SUPABASE_URL/rest/v1/journal_entries", rows.toString(), token,
            mapOf("Prefer" to "resolution=merge-duplicates,return=minimal")
        )
        if (code !in 200..299) throw IOException("Push failed ($code): $resp")
    }

    private fun request(
        method: String,
        url: String,
        body: String?,
        bearer: String?,
        extraHeaders: Map<String, String> = emptyMap(),
    ): Pair<Int, String> {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 15_000
            conn.readTimeout = 20_000
            conn.setRequestProperty("apikey", ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer ${bearer ?: ANON_KEY}")
            conn.setRequestProperty("Content-Type", "application/json")
            extraHeaders.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            if (body != null) {
                conn.doOutput = true
                conn.outputStream.use { it.write(body.toByteArray()) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            return code to text
        } finally {
            conn.disconnect()
        }
    }
}
