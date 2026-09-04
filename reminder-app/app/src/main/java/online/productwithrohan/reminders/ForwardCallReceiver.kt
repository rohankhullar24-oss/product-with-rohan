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
 * Forwards a missed call as an SMS to [ForwardCallSettings.forwardTo].
 * Detected via the RINGING -> IDLE phone-state transition without ever
 * passing through OFFHOOK (i.e. never answered) — the same heuristic
 * call-screening apps use, since Android doesn't broadcast a distinct
 * "missed call" event of its own. The actual caller number comes from the
 * call log rather than the state-changed intent's own extra, which needs
 * READ_CALL_LOG anyway from Android 10 onward.
 */
class ForwardCallReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val previousState = lastState
        lastState = state
        if (state != TelephonyManager.EXTRA_STATE_IDLE || previousState != TelephonyManager.EXTRA_STATE_RINGING) return
        if (!ForwardCallSettings.isEnabled(context)) return

        val appContext = context.applicationContext
        val pendingResult = goAsync()
        // The call-log entry for this call isn't guaranteed to exist the
        // instant IDLE fires — give it a beat before querying.
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                forwardIfMissed(appContext)
            } finally {
                pendingResult.finish()
            }
        }, 1500)
    }

    private fun forwardIfMissed(context: Context) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG)
            != PackageManager.PERMISSION_GRANTED
        ) return

        val number = try {
            context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE),
                null, null,
                "${CallLog.Calls.DATE} DESC LIMIT 1",
            )?.use { cursor ->
                if (!cursor.moveToFirst()) return
                val type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                if (type != CallLog.Calls.MISSED_TYPE) return
                cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
            }
        } catch (e: SecurityException) {
            null
        } ?: return
        if (number.isBlank()) return

        val forwardTo = ForwardCallSettings.forwardTo(context)
        if (forwardTo.isBlank()) return
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        try {
            val smsManager = SmsManager.getDefault()
            val message = context.getString(R.string.forward_call_message_format, number)
            smsManager.sendMultipartTextMessage(forwardTo, null, smsManager.divideMessage(message), null, null)
            if (ForwardCallSettings.notifyOnSend(context)) {
                AutoTextNotify.show(
                    context,
                    context.getString(R.string.forward_call_sent_title),
                    context.getString(R.string.forward_call_sent_text),
                )
            }
        } catch (e: Exception) {
            // Best-effort — nothing else to do with a failed call-forward SMS.
        }
    }

    companion object {
        @Volatile private var lastState: String = TelephonyManager.EXTRA_STATE_IDLE
    }
}
