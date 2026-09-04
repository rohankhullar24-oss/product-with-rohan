package online.productwithrohan.reminders

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Watches for incoming WhatsApp message notifications and, per the global
 * settings in [AutoReplySettings] / [AutoForwardSettings], triggers an
 * auto-reply (types into the sender's already-open chat, via the
 * notification's own tap intent) or an auto-forward (relays the text to a
 * fixed number via [ChatAppSender]).
 *
 * Heuristic by nature — WhatsApp doesn't publish a message-notification
 * contract, so this reads the same MessagingStyle/extras any notification
 * listener would, and skips group-summary notifications to avoid double
 * firing. Notification access is a special access, granted from Settings,
 * not a runtime permission — see [isEnabled].
 */
class AutoTextNotificationListenerService : NotificationListenerService() {

    private val lastSeenWhen = HashMap<String, Long>()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != "com.whatsapp") return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val postedWhen = sbn.notification.`when`
        if (lastSeenWhen[sbn.key] == postedWhen) return
        lastSeenWhen[sbn.key] = postedWhen

        val (sender, text) = extractMessage(sbn.notification) ?: return
        if (text.isBlank()) return

        if (AutoReplySettings.isEnabled(this)) triggerAutoReply(sbn)
        if (AutoForwardSettings.isEnabled(this)) triggerAutoForward(sender, text)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        lastSeenWhen.remove(sbn.key)
    }

    /** (sender display name, latest message text), preferring MessagingStyle over the flat extras. */
    private fun extractMessage(notification: Notification): Pair<String, String>? {
        val style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification)
        val lastMessage = style?.messages?.lastOrNull()
        if (lastMessage != null) {
            val sender = lastMessage.person?.name?.toString() ?: style.conversationTitle?.toString().orEmpty()
            return sender to lastMessage.text.toString()
        }
        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        if (title.isBlank() && text.isBlank()) return null
        return title to text
    }

    /**
     * Opens the sender's chat via the notification's own tap intent (we don't
     * have their phone number from a notification alone) and asks
     * [AutoTextAccessibilityService] to type the reply in and send it.
     */
    private fun triggerAutoReply(sbn: StatusBarNotification) {
        val message = AutoReplySettings.message(this)
        if (message.isBlank()) return
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
