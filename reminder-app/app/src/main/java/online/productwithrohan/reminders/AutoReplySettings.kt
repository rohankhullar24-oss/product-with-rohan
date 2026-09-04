package online.productwithrohan.reminders

import android.content.Context

/**
 * A single global WhatsApp auto-reply rule (not per-contact) — replies to
 * every incoming WhatsApp message while enabled. Kept intentionally simple
 * for personal use; see AutoTextNotificationListenerService for the trigger.
 */
object AutoReplySettings {
    private const val PREFS = "auto_reply_settings"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_MESSAGE = "message"
    private const val KEY_NOTIFY = "notify_on_send"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun message(context: Context): String = prefs(context).getString(KEY_MESSAGE, "") ?: ""
    fun notifyOnSend(context: Context): Boolean = prefs(context).getBoolean(KEY_NOTIFY, true)

    fun save(context: Context, enabled: Boolean, message: String, notifyOnSend: Boolean) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putString(KEY_MESSAGE, message)
            .putBoolean(KEY_NOTIFY, notifyOnSend)
            .apply()
    }
}
