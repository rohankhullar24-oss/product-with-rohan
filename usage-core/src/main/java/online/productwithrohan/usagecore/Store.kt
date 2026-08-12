package online.productwithrohan.usagecore

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Whether the last fetch decided we still have a usable session. */
enum class AuthState { OK, NEEDS_LOGIN }

/**
 * Storage in two tiers.
 *
 * Credentials live in Keystore-backed [EncryptedSharedPreferences]: the session
 * cookie is a full account credential. The usage snapshot is ordinary prefs —
 * it holds no secret and the widget reads it on every frame, so it must stay
 * cheap to read from any process.
 */
class Store private constructor(
    private val secure: SharedPreferences,
    private val plain: SharedPreferences,
    private val defaultWarnEnabled: Boolean,
    private val defaultRingOnReset: Boolean,
) {

    // ---- credentials (encrypted) ----

    var sessionKey: String?
        get() = secure.getString(KEY_SESSION, null)
        set(value) = secure.edit().putString(KEY_SESSION, value).apply()

    var clearance: String?
        get() = secure.getString(KEY_CLEARANCE, null)
        set(value) = secure.edit().putString(KEY_CLEARANCE, value).apply()

    /**
     * The exact User-Agent of the WebView that solved the Cloudflare challenge.
     * Replaying the usage request with a different agent invalidates the
     * clearance cookie, so this is stored and reused verbatim.
     */
    var userAgent: String?
        get() = secure.getString(KEY_USER_AGENT, null)
        set(value) = secure.edit().putString(KEY_USER_AGENT, value).apply()

    var organizationId: String?
        get() = secure.getString(KEY_ORG, null)
        set(value) = secure.edit().putString(KEY_ORG, value).apply()

    val isSignedIn: Boolean get() = !sessionKey.isNullOrBlank()

    fun signOut() {
        secure.edit().clear().apply()
        plain.edit().clear().apply()
    }

    // ---- usage snapshot (plain) ----

    var sessionUtilization: Float
        get() = plain.getFloat(KEY_SESSION_UTIL, UNSET)
        private set(value) = plain.edit().putFloat(KEY_SESSION_UTIL, value).apply()

    var sessionResetAt: Long
        get() = plain.getLong(KEY_SESSION_RESET, 0L)
        private set(value) = plain.edit().putLong(KEY_SESSION_RESET, value).apply()

    var weeklyUtilization: Float
        get() = plain.getFloat(KEY_WEEKLY_UTIL, UNSET)
        private set(value) = plain.edit().putFloat(KEY_WEEKLY_UTIL, value).apply()

    var weeklyResetAt: Long
        get() = plain.getLong(KEY_WEEKLY_RESET, 0L)
        private set(value) = plain.edit().putLong(KEY_WEEKLY_RESET, value).apply()

    var fetchedAt: Long
        get() = plain.getLong(KEY_FETCHED_AT, 0L)
        private set(value) = plain.edit().putLong(KEY_FETCHED_AT, value).apply()

    var authState: AuthState
        get() = AuthState.entries.getOrElse(plain.getInt(KEY_AUTH_STATE, 0)) { AuthState.OK }
        set(value) = plain.edit().putInt(KEY_AUTH_STATE, value.ordinal).apply()

    // ---- alert settings ----
    //
    // The defaults differ per app and come from a bool resource each app can
    // override: the standalone widget rings on reset out of the box, while
    // Reminders leaves that off so the two don't ring at the same moment.

    var warnEnabled: Boolean
        get() = plain.getBoolean(KEY_WARN_ENABLED, defaultWarnEnabled)
        set(value) = plain.edit().putBoolean(KEY_WARN_ENABLED, value).apply()

    /** Percent of a window at which to warn, 1..99. */
    var warnThresholdPercent: Int
        get() = plain.getInt(KEY_WARN_THRESHOLD, DEFAULT_WARN_THRESHOLD).coerceIn(1, 99)
        set(value) = plain.edit().putInt(KEY_WARN_THRESHOLD, value.coerceIn(1, 99)).apply()

    var ringOnResetEnabled: Boolean
        get() = plain.getBoolean(KEY_RING_ON_RESET, defaultRingOnReset)
        set(value) = plain.edit().putBoolean(KEY_RING_ON_RESET, value).apply()

    /**
     * The reset timestamp of the window instance we last warned about.
     *
     * Keying on the reset time is what stops the 15-minute refresh re-notifying
     * for as long as usage sits above the threshold: the same window keeps the
     * same reset time, and a new window brings a new one, which re-arms the
     * warning without any cleanup.
     */
    fun warnedResetAt(window: ResetWindow): Long =
        plain.getLong(warnedKey(window), 0L)

    fun setWarnedResetAt(window: ResetWindow, resetAt: Long) {
        plain.edit().putLong(warnedKey(window), resetAt).apply()
    }

    private fun warnedKey(window: ResetWindow) = "warned_reset_at_${window.key}"

    /** True once any successful fetch has landed, so the widget has something to draw. */
    val hasSnapshot: Boolean get() = sessionUtilization >= 0f

    fun saveSnapshot(snapshot: UsageSnapshot) {
        plain.edit()
            .putFloat(KEY_SESSION_UTIL, snapshot.session.utilization)
            .putLong(KEY_SESSION_RESET, snapshot.session.resetsAtEpochMillis)
            .putFloat(KEY_WEEKLY_UTIL, snapshot.weekly.utilization)
            .putLong(KEY_WEEKLY_RESET, snapshot.weekly.resetsAtEpochMillis)
            .putLong(KEY_FETCHED_AT, snapshot.fetchedAtEpochMillis)
            .apply()
    }

    companion object {
        private const val UNSET = -1f

        private const val KEY_SESSION = "session_key"
        private const val KEY_CLEARANCE = "clearance"
        private const val KEY_USER_AGENT = "user_agent"
        private const val KEY_ORG = "organization_id"

        private const val KEY_SESSION_UTIL = "session_utilization"
        private const val KEY_SESSION_RESET = "session_reset_at"
        private const val KEY_WEEKLY_UTIL = "weekly_utilization"
        private const val KEY_WEEKLY_RESET = "weekly_reset_at"
        private const val KEY_FETCHED_AT = "fetched_at"
        private const val KEY_AUTH_STATE = "auth_state"

        private const val KEY_WARN_ENABLED = "warn_enabled"
        private const val KEY_WARN_THRESHOLD = "warn_threshold_percent"
        private const val KEY_RING_ON_RESET = "ring_on_reset"

        const val DEFAULT_WARN_THRESHOLD = 80

        private const val SECURE_PREFS = "claude_limits_secure"
        private const val PLAIN_PREFS = "claude_limits_usage"

        @Volatile
        private var instance: Store? = null

        fun get(context: Context): Store = instance ?: synchronized(this) {
            instance ?: build(context.applicationContext).also { instance = it }
        }

        private fun build(app: Context): Store = Store(
            secure = openSecurePrefs(app),
            plain = app.getSharedPreferences(PLAIN_PREFS, Context.MODE_PRIVATE),
            defaultWarnEnabled = app.resources.getBoolean(R.bool.usage_default_warn_enabled),
            defaultRingOnReset = app.resources.getBoolean(R.bool.usage_default_ring_on_reset),
        )

        /**
         * The encrypted keyset can be left unreadable by a device-to-device
         * transfer or a restored backup, which surfaces as an exception here
         * rather than at write time. Wipe it and start clean once — the only
         * cost is that the user signs in again.
         */
        private fun openSecurePrefs(app: Context): SharedPreferences = try {
            createSecurePrefs(app)
        } catch (_: Exception) {
            app.deleteSharedPreferences(SECURE_PREFS)
            createSecurePrefs(app)
        }

        private fun createSecurePrefs(app: Context): SharedPreferences {
            val masterKey = MasterKey.Builder(app)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            return EncryptedSharedPreferences.create(
                app,
                SECURE_PREFS,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        }
    }
}
