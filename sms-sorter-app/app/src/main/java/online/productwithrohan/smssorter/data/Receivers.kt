package online.productwithrohan.smssorter.data

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.provider.Telephony
import online.productwithrohan.smssorter.core.Brands
import online.productwithrohan.smssorter.core.Classifier
import kotlin.concurrent.thread

/** Receives SMS when SMS Sorter is the default SMS app and stores them (the system no longer does). */
class SmsDeliverReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_DELIVER_ACTION) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (parts.isNullOrEmpty()) return
        val address = parts[0].displayOriginatingAddress ?: parts[0].originatingAddress ?: return
        val body = parts.joinToString("") { it.displayMessageBody ?: "" }
        val sentAt = parts[0].timestampMillis

        val pending = goAsync()
        thread {
            try {
                val repo = SmsRepository(context)
                repo.insertIncoming(address, body, sentAt)
                val name = repo.contactNames(listOf(address))[address] ?: Brands.nameFor(address) ?: address
                Notifier.show(context, name, body, address, Classifier.classify(address, body))
            } finally {
                pending.finish()
            }
        }
    }
}

/** MMS isn't supported yet; the receiver exists because Android requires it of default SMS apps. */
class MmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = Unit
}

/** Handles "Respond via message" from the incoming-call screen. */
class HeadlessSmsSendService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val address = intent?.data?.schemeSpecificPart?.substringBefore('?')
        val text = intent?.getStringExtra(Intent.EXTRA_TEXT)
        if (!address.isNullOrBlank() && !text.isNullOrBlank()) {
            thread {
                runCatching { SmsRepository(applicationContext).send(address, text) }
                stopSelf(startId)
            }
        } else {
            stopSelf(startId)
        }
        return START_NOT_STICKY
    }
}
