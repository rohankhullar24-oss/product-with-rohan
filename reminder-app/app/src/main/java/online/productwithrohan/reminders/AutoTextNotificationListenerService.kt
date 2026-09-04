package online.productwithrohan.reminders

import android.app.Notification
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Watches for incoming WhatsApp message (and missed-call) notifications and,
 * per the settings in [AutoReplySettings] / [AutoForwardSettings], triggers
 * an auto-reply (types into the sender's already-open chat, via the
 * notification's own tap intent) or an auto-forward (relays the text to a
 * fixed number via [ChatAppSender]).
 *
 * A reply only fires if the sender clears every gate: not on the ignored
 * list, allowed by the filter mode, from a 1:1 chat (unless group replies
 * are on), and every device-state condition in [AutoReplyConditions] holds.
 * The message sent is a per-sender override from [AutoReplyRuleStore] if one
 * exists, else the global message; it can be delayed a configurable number
 * of seconds first.
 *
 * Heuristic by nature — WhatsApp doesn't publish a message-notification
 * contract, so this reads the same MessagingStyle/extras any notification
 * listener would, and skips group-summary notifications to avoid double
 * firing. Notification access is a special access, granted from Settings,
 * not a runtime permission — see [isEnabled].
 */
class AutoTextNotificationListenerService : NotificationListenerService() {

    private val lastSeenWhen = HashMap<String, Long>()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != "com.whatsapp") return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val postedWhen = sbn.notification.`when`
        if (lastSeenWhen[sbn.key] == postedWhen) return
        lastSeenWhen[sbn.key] = postedWhen

        val extracted = extractMessage(sbn.notification) ?: return
        val (sender, text, isGroup) = extracted
        if (text.isBlank()) return

        val missedCall = isMissedCallText(text)
        if (missedCall) {
            if (AutoReplySettings.isEnabled(this) && AutoReplySettings.replyToMissedCall(this)) {
                maybeAutoReply(sbn, sender, isGroup)
            }
            return
        }

        if (AutoReplySettings.isEnabled(this)) maybeAutoReply(sbn, sender, isGroup)
        if (AutoForwardSettings.isEnabled(this)) triggerAutoForward(sender, text)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        lastSeenWhen.remove(sbn.key)
    }

    private data class Extracted(val sender: String, val text: String, val isGroup: Boolean)

    /** (sender display name, latest message text, is-group-chat), preferring MessagingStyle over the flat extras. */
    private fun extractMessage(notification: Notification): Extracted? {
        val style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification)
        val lastMessage = style?.messages?.lastOrNull()
        if (lastMessage != null) {
            val sender = lastMessage.person?.name?.toString() ?: style.conversationTitle?.toString().orEmpty()
            return Extracted(sender, lastMessage.text.toString(), style.isGroupConversation)
        }
        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        if (title.isBlank() && text.isBlank()) return null
        return Extracted(title, text, isGroup = false)
    }

    private fun isMissedCallText(text: String): Boolean =
        text.contains("missed voice call", ignoreCase = true) ||
            text.contains("missed video call", ignoreCase = true)

    private fun maybeAutoReply(sbn: StatusBarNotification, sender: String, isGroup: Boolean) {
        if (isGroup && !AutoReplySettings.includeGroups(this)) return
        val normalizedSender = sender.trim().lowercase()
        if (normalizedSender in AutoReplySettings.ignoredSenders(this)) return
        if (AutoReplySettings.filterMode(this) == AutoReplyFilterMode.SPECIFIC &&
            normalizedSender !in AutoReplySettings.allowedSenders(this)
        ) return
        if (!AutoReplyConditions.allSatisfied(this)) return

        val message = AutoReplyRuleStore.findFor(this, sender)?.message?.takeIf { it.isNotBlank() }
            ?: AutoReplySettings.message(this)
        if (message.isBlank()) return

        val delayMs = AutoReplySettings.delaySeconds(this) * 1000L
        if (delayMs <= 0) {
            sendReply(sbn, message)
        } else {
            mainHandler.postDelayed({ sendReply(sbn, message) }, delayMs)
        }
    }

    /**
     * Opens the sender's chat via the notification's own tap intent (we don't
     * have their phone number from a notification alone) and asks
     * [AutoTextAccessibilityService] to type the reply in and send it.
     */
    private fun sendReply(sbn: StatusBarNotification, message: String) {
        val contentIntent = sbn.notification.contentIntent ?: return
        try {
            contentIntent.send()
        } catch (e: android.app.PendingIntent.CanceledException) {
            return
        }
        val token = AutoTextAccessibilityService.startPendingReply(this, message)
        PendingActionWatchdogReceiver.schedule(this, token)
    }

    private fun triggerAutoForward(sender: String, incomingText: String) {
        val forwardTo = AutoForwardSettings.forwardTo(this)
        if (forwardTo.isBlank()) return
        val forwarded = getString(R.string.auto_forward_message_format, sender, incomingText)
        ChatAppSender.sendPrefilled(this, ChatApp.WHATSAPP, forwardTo, forwarded, PendingActionKind.FORWARD)
    }

    companion object {
        fun isEnabled(context: Context): Boolean =
            NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }
}
