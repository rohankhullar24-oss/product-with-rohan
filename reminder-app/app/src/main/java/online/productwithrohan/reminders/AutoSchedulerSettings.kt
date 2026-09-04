package online.productwithrohan.reminders

import android.content.Context

/** SMS/WhatsApp signature text and the delay between bulk-SMS sends. */
object AutoSchedulerSettings {
    private const val PREFS = "auto_scheduler_settings"
    private const val KEY_SMS_SIGNATURE_ENABLED = "sms_signature_enabled"
    private const val KEY_SMS_SIGNATURE = "sms_signature"
    private const val KEY_WHATSAPP_SIGNATURE_ENABLED = "whatsapp_signature_enabled"
    private const val KEY_WHATSAPP_SIGNATURE = "whatsapp_signature"
    private const val KEY_SMS_DELAY_SECONDS = "sms_delay_seconds"
    private const val KEY_NOTIFY_ON_FAILURE = "notify_on_failure"

    /** Bulk SMS sends run on goAsync(), so bound this to keep well under the ~10s receiver limit. */
    const val MAX_SMS_DELAY_SECONDS = 5

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun smsSignatureEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_SMS_SIGNATURE_ENABLED, false)
    fun smsSignature(context: Context): String = prefs(context).getString(KEY_SMS_SIGNATURE, "") ?: ""
    fun whatsAppSignatureEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_WHATSAPP_SIGNATURE_ENABLED, false)
    fun whatsAppSignature(context: Context): String = prefs(context).getString(KEY_WHATSAPP_SIGNATURE, "") ?: ""
    fun smsDelaySeconds(context: Context): Int = prefs(context).getInt(KEY_SMS_DELAY_SECONDS, 0)
    /** Defaults on — a failed task is easy to miss otherwise since it just sits in the Failed tab. */
    fun notifyOnFailure(context: Context): Boolean = prefs(context).getBoolean(KEY_NOTIFY_ON_FAILURE, true)
    fun setNotifyOnFailure(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_NOTIFY_ON_FAILURE, enabled).apply()
    }

    /** Appends the relevant signature to [message] if one is configured and enabled. */
    fun applySmsSignature(context: Context, message: String): String =
        if (smsSignatureEnabled(context) && smsSignature(context).isNotBlank()) "$message\n${smsSignature(context)}" else message

    fun applyWhatsAppSignature(context: Context, message: String): String =
        if (whatsAppSignatureEnabled(context) && whatsAppSignature(context).isNotBlank())
            "$message\n${whatsAppSignature(context)}" else message

    fun save(
        context: Context,
        smsSignatureEnabled: Boolean, smsSignature: String,
        whatsAppSignatureEnabled: Boolean, whatsAppSignature: String,
        smsDelaySeconds: Int,
    ) {
        prefs(context).edit()
            .putBoolean(KEY_SMS_SIGNATURE_ENABLED, smsSignatureEnabled)
            .putString(KEY_SMS_SIGNATURE, smsSignature)
            .putBoolean(KEY_WHATSAPP_SIGNATURE_ENABLED, whatsAppSignatureEnabled)
            .putString(KEY_WHATSAPP_SIGNATURE, whatsAppSignature)
            .putInt(KEY_SMS_DELAY_SECONDS, smsDelaySeconds.coerceIn(0, MAX_SMS_DELAY_SECONDS))
            .apply()
    }
}
