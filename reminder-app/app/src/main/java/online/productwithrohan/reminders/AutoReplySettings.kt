package online.productwithrohan.reminders

import android.content.Context

/** Who an auto-reply is allowed to go to. */
enum class AutoReplyFilterMode { EVERYONE, SPECIFIC }

/**
 * The global WhatsApp auto-reply rule: one message (or a per-sender override,
 * see [AutoReplyRuleStore]) sent back automatically while enabled, gated by
 * sender filtering and device-state conditions. Kept as a single set of rules
 * (not a rule engine) for personal use; see AutoTextNotificationListenerService
 * for the trigger and where every field here is read.
 */
object AutoReplySettings {
    private const val PREFS = "auto_reply_settings"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_MESSAGE = "message"
    private const val KEY_NOTIFY = "notify_on_send"
    private const val KEY_FILTER_MODE = "filter_mode"
    private const val KEY_ALLOWED_SENDERS = "allowed_senders"
    private const val KEY_IGNORED_SENDERS = "ignored_senders"
    private const val KEY_DELAY_SECONDS = "delay_seconds"
    private const val KEY_INCLUDE_GROUPS = "include_groups"
    private const val KEY_REQUIRE_SCREEN_LOCKED = "require_screen_locked"
    private const val KEY_REQUIRE_CHARGING = "require_charging"
    private const val KEY_REQUIRE_SILENT_OR_DND = "require_silent_or_dnd"
    private const val KEY_REQUIRE_BLUETOOTH_ON = "require_bluetooth_on"
    private const val KEY_REPLY_TO_MISSED_CALL = "reply_to_missed_call"
    private const val KEY_INCLUDE_TELEGRAM = "include_telegram"
    private const val KEY_REPLY_TO_SMS = "reply_to_sms"

    /** Delay runs on an in-process Handler, so keep it short enough to survive the process staying alive. */
    const val MAX_DELAY_SECONDS = 120

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun message(context: Context): String = prefs(context).getString(KEY_MESSAGE, "") ?: ""
    fun notifyOnSend(context: Context): Boolean = prefs(context).getBoolean(KEY_NOTIFY, true)

    fun filterMode(context: Context): AutoReplyFilterMode =
        try {
            AutoReplyFilterMode.valueOf(prefs(context).getString(KEY_FILTER_MODE, null) ?: "EVERYONE")
        } catch (e: IllegalArgumentException) {
            AutoReplyFilterMode.EVERYONE
        }

    fun allowedSenders(context: Context): Set<String> = linesToSet(prefs(context).getString(KEY_ALLOWED_SENDERS, ""))
    fun ignoredSenders(context: Context): Set<String> = linesToSet(prefs(context).getString(KEY_IGNORED_SENDERS, ""))
    fun allowedSendersText(context: Context): String = prefs(context).getString(KEY_ALLOWED_SENDERS, "") ?: ""
    fun ignoredSendersText(context: Context): String = prefs(context).getString(KEY_IGNORED_SENDERS, "") ?: ""

    fun delaySeconds(context: Context): Int = prefs(context).getInt(KEY_DELAY_SECONDS, 0)
    /** Off by default — matches the original always-1:1 behavior. */
    fun includeGroups(context: Context): Boolean = prefs(context).getBoolean(KEY_INCLUDE_GROUPS, false)
    fun requireScreenLocked(context: Context): Boolean = prefs(context).getBoolean(KEY_REQUIRE_SCREEN_LOCKED, false)
    fun requireCharging(context: Context): Boolean = prefs(context).getBoolean(KEY_REQUIRE_CHARGING, false)
    fun requireSilentOrDnd(context: Context): Boolean = prefs(context).getBoolean(KEY_REQUIRE_SILENT_OR_DND, false)
    fun requireBluetoothOn(context: Context): Boolean = prefs(context).getBoolean(KEY_REQUIRE_BLUETOOTH_ON, false)
    fun replyToMissedCall(context: Context): Boolean = prefs(context).getBoolean(KEY_REPLY_TO_MISSED_CALL, false)
    /** Off by default — matches the original WhatsApp-only behavior; also gates Auto Forward's Telegram messages. */
    fun includeTelegram(context: Context): Boolean = prefs(context).getBoolean(KEY_INCLUDE_TELEGRAM, false)
    /** Off by default — a separate toggle from the WhatsApp/Telegram one so turning one on doesn't silently enable the other. */
    fun replyToSms(context: Context): Boolean = prefs(context).getBoolean(KEY_REPLY_TO_SMS, false)

    /** One name per line — matched case/whitespace-insensitively against the notification sender name. */
    private fun linesToSet(raw: String?): Set<String> =
        raw.orEmpty().lineSequence().map { it.trim() }.filter { it.isNotBlank() }
            .map { it.lowercase() }.toSet()

    fun save(
        context: Context,
        enabled: Boolean,
        message: String,
        notifyOnSend: Boolean,
        filterMode: AutoReplyFilterMode,
        allowedSendersText: String,
        ignoredSendersText: String,
        delaySeconds: Int,
        includeGroups: Boolean,
        requireScreenLocked: Boolean,
        requireCharging: Boolean,
        requireSilentOrDnd: Boolean,
        requireBluetoothOn: Boolean,
        replyToMissedCall: Boolean,
        includeTelegram: Boolean,
        replyToSms: Boolean,
    ) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putString(KEY_MESSAGE, message)
            .putBoolean(KEY_NOTIFY, notifyOnSend)
            .putString(KEY_FILTER_MODE, filterMode.name)
            .putString(KEY_ALLOWED_SENDERS, allowedSendersText)
            .putString(KEY_IGNORED_SENDERS, ignoredSendersText)
            .putInt(KEY_DELAY_SECONDS, delaySeconds.coerceIn(0, MAX_DELAY_SECONDS))
            .putBoolean(KEY_INCLUDE_GROUPS, includeGroups)
            .putBoolean(KEY_REQUIRE_SCREEN_LOCKED, requireScreenLocked)
            .putBoolean(KEY_REQUIRE_CHARGING, requireCharging)
            .putBoolean(KEY_REQUIRE_SILENT_OR_DND, requireSilentOrDnd)
            .putBoolean(KEY_REQUIRE_BLUETOOTH_ON, requireBluetoothOn)
            .putBoolean(KEY_REPLY_TO_MISSED_CALL, replyToMissedCall)
            .putBoolean(KEY_INCLUDE_TELEGRAM, includeTelegram)
            .putBoolean(KEY_REPLY_TO_SMS, replyToSms)
            .apply()
    }
}
