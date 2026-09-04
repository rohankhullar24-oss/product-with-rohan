package online.productwithrohan.reminders

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.telephony.SmsManager
import androidx.core.content.ContextCompat

/**
 * Direct SMS counterpart to [AutoTextNotificationListenerService]'s WhatsApp/
 * Telegram auto-reply: SMS doesn't need the notification+accessibility dance
 * since [SmsManager] can just send a reply straight to the sender's number.
 * Gated by the same [AutoReplyEngine] rules, plus its own "Also reply to SMS"
 * toggle so turning WhatsApp Auto Reply on doesn't silently start
 * auto-replying to texts too.
 */
class SmsAutoReplyReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        if (!AutoReplySettings.isEnabled(context) || !AutoReplySettings.replyToSms(context)) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return
        val sender = messages[0].originatingAddress?.takeIf { it.isNotBlank() } ?: return
        val message = AutoReplyEngine.resolveMessage(context, sender) ?: return

        val appContext = context.applicationContext
        val delayMs = AutoReplySettings.delaySeconds(context) * 1000L
        if (delayMs <= 0) {
            sendReply(appContext, sender, message)
        } else {
            Handler(Looper.getMainLooper()).postDelayed({ sendReply(appContext, sender, message) }, delayMs)
        }
    }

    private fun sendReply(context: Context, sender: String, message: String) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return
        try {
            val smsManager = SmsManager.getDefault()
            smsManager.sendMultipartTextMessage(sender, null, smsManager.divideMessage(message), null, null)
            if (AutoReplySettings.notifyOnSend(context)) {
                AutoTextNotify.show(
                    context,
                    context.getString(R.string.auto_reply_sent_title),
                    context.getString(R.string.auto_reply_sent_text),
                )
            }
        } catch (e: Exception) {
            // Best-effort — nothing else to do with a failed SMS auto-reply.
        }
    }
}
