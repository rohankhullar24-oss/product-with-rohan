package online.productwithrohan.reminders

import android.content.Context

/**
 * Sender/condition gating shared by every Auto Reply transport —
 * [AutoTextNotificationListenerService] (WhatsApp/Telegram) and
 * [SmsAutoReplyReceiver] (SMS) all resolve "should this sender get a reply,
 * and with what message" the same way; only how the reply actually gets
 * sent differs per transport.
 */
object AutoReplyEngine {

    /** Null means don't reply — blocked by group/ignore/filter/conditions, or no message configured. */
    fun resolveMessage(context: Context, sender: String, isGroup: Boolean = false): String? {
        if (isGroup && !AutoReplySettings.includeGroups(context)) return null
        val normalizedSender = sender.trim().lowercase()
        if (normalizedSender.isBlank()) return null
        if (normalizedSender in AutoReplySettings.ignoredSenders(context)) return null
        if (AutoReplySettings.filterMode(context) == AutoReplyFilterMode.SPECIFIC &&
            normalizedSender !in AutoReplySettings.allowedSenders(context)
        ) return null
        if (!AutoReplyConditions.allSatisfied(context)) return null

        val message = AutoReplyRuleStore.findFor(context, sender)?.message?.takeIf { it.isNotBlank() }
            ?: AutoReplySettings.message(context)
        return message.takeIf { it.isNotBlank() }
    }
}
