package online.productwithrohan.reminders

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.provider.CallLog
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat

/**
 * Sends [CallReplySettings.message] back to the caller once a call ends,
 * via the same RINGING/OFFHOOK -> IDLE phone-state heuristic
 * [ForwardCallReceiver] uses (Android has no distinct "call ended"
 * broadcast). RINGING -> IDLE (never answered) is a missed call;
 * OFFHOOK -> IDLE (was answered) is an ended call — each gated by its own
 * toggle in [CallReplySettings].
 */
class CallReplyReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val previousState = lastState
        lastState = state
        if (state != TelephonyManager.EXTRA_STATE_IDLE) return
        val wasMissed = previousState == TelephonyManager.EXTRA_STATE_RINGING
        val wasEnded = previousState == TelephonyManager.EXTRA_STATE_OFFHOOK
        if (!wasMissed && !wasEnded) return
        if (!CallReplySettings.isEnabled(context)) return
        if (wasMissed && !CallReplySettings.replyToMissed(context)) return
        if (wasEnded && !CallReplySettings.replyToEnded(context)) return

        val appContext = context.applicationContext
        val pendingResult = goAsync()
        // The call-log entry for this call isn't guaranteed to exist the
        // instant IDLE fires — give it a beat before querying.
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                replyToLastCaller(appContext)
            } finally {
                pendingResult.finish()
            }
        }, 1500)
    }

    private fun replyToLastCaller(context: Context) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG)
            != PackageManager.PERMISSION_GRANTED
        ) return

        val number = try {
            context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls.NUMBER),
                null, null,
                "${CallLog.Calls.DATE} DESC LIMIT 1",
            )?.use { cursor ->
                if (!cursor.moveToFirst()) return
                cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
            }
        } catch (e: SecurityException) {
            null
        } ?: return
        if (number.isBlank()) return

        val message = CallReplySettings.message(context)
        if (message.isBlank()) return
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        try {
            val smsManager = SmsManager.getDefault()
            smsManager.sendMultipartTextMessage(number, null, smsManager.divideMessage(message), null, null)
            if (CallReplySettings.notifyOnSend(context)) {
                AutoTextNotify.show(
                    context,
                    context.getString(R.string.call_reply_sent_title),
                    context.getString(R.string.call_reply_sent_text),
                )
            }
        } catch (e: Exception) {
            // Best-effort — nothing else to do with a failed call-reply SMS.
        }
    }

    companion object {
        @Volatile private var lastState: String = TelephonyManager.EXTRA_STATE_IDLE
    }
}
