package online.productwithrohan.reminders

import android.content.Context

/**
 * A single global "forward a missed call via SMS" rule — mirrors
 * [AutoForwardSettings] (one destination, not per-caller) but for phone
 * calls instead of WhatsApp messages. See [ForwardCallReceiver] for the
 * trigger.
 */
object ForwardCallSettings {
    private const val PREFS = "forward_call_settings"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_FORWARD_TO = "forward_to"
    private const val KEY_NOTIFY = "notify_on_send"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun forwardTo(context: Context): String = prefs(context).getString(KEY_FORWARD_TO, "") ?: ""
    fun notifyOnSend(context: Context): Boolean = prefs(context).getBoolean(KEY_NOTIFY, true)

    fun save(context: Context, enabled: Boolean, forwardTo: String, notifyOnSend: Boolean) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putString(KEY_FORWARD_TO, forwardTo)
            .putBoolean(KEY_NOTIFY, notifyOnSend)
            .apply()
    }
}
