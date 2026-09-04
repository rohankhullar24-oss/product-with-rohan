package online.productwithrohan.reminders

import android.content.Context

/**
 * Auto-replies via SMS to the *caller* once a phone call ends — missed
 * (never answered) or ended (answered then hung up) — as opposed to
 * [ForwardCallSettings], which forwards a missed call's number to someone
 * else. See [CallReplyReceiver] for the trigger.
 */
object CallReplySettings {
    private const val PREFS = "call_reply_settings"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_MESSAGE = "message"
    private const val KEY_REPLY_TO_MISSED = "reply_to_missed"
    private const val KEY_REPLY_TO_ENDED = "reply_to_ended"
    private const val KEY_NOTIFY = "notify_on_send"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun message(context: Context): String = prefs(context).getString(KEY_MESSAGE, "") ?: ""
    /** Defaults on — matches the original missed-call-only intent of this feature. */
    fun replyToMissed(context: Context): Boolean = prefs(context).getBoolean(KEY_REPLY_TO_MISSED, true)
    /** Off by default — an answered call rarely needs a follow-up text too. */
    fun replyToEnded(context: Context): Boolean = prefs(context).getBoolean(KEY_REPLY_TO_ENDED, false)
    fun notifyOnSend(context: Context): Boolean = prefs(context).getBoolean(KEY_NOTIFY, true)

    fun save(
        context: Context,
        enabled: Boolean,
        message: String,
        replyToMissed: Boolean,
        replyToEnded: Boolean,
        notifyOnSend: Boolean,
    ) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putString(KEY_MESSAGE, message)
            .putBoolean(KEY_REPLY_TO_MISSED, replyToMissed)
            .putBoolean(KEY_REPLY_TO_ENDED, replyToEnded)
            .putBoolean(KEY_NOTIFY, notifyOnSend)
            .apply()
        SettingsSyncMeta.touch(context, PREFS)
    }
}
