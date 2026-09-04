package online.productwithrohan.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fires ~25s after something hands a WhatsApp action off to
 * [AutoTextAccessibilityService] (a scheduled send, an auto-reply, or an
 * auto-forward). Accessibility events aren't guaranteed — WhatsApp's UI can
 * change, a permission dialog can steal focus, the phone can be locked — so
 * without this a stuck action would stay pending forever. A TASK action also
 * gets marked FAILED in [AutoTaskStore] so it shows up in the Failed tab;
 * REPLY/FORWARD have no task record, so timing them out just clears the
 * pending marker.
 */
class PendingActionWatchdogReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val token = intent.getStringExtra(EXTRA_TOKEN) ?: return
        val pending = AutoTextAccessibilityService.currentPending(context) ?: return
        if (pending.token != token) return

        if (pending.kind == PendingActionKind.TASK && pending.taskId != null) {
            AutoTaskStore.get(context, pending.taskId)?.let { task ->
                if (task.status == AutoTaskStatus.PENDING) {
                    task.status = AutoTaskStatus.FAILED
                    task.failureReason = "Couldn't find WhatsApp's Send button in time"
                    task.updatedAt = System.currentTimeMillis()
                    AutoTaskStore.upsert(context, task)
                }
            }
        }
        AutoTextAccessibilityService.clearIfToken(context, token)
    }

    companion object {
        private const val EXTRA_TOKEN = "watchdog_token"
        private const val TIMEOUT_MS = 25_000L

        private fun pendingIntent(context: Context, token: String): PendingIntent {
            val intent = Intent(context, PendingActionWatchdogReceiver::class.java)
                .putExtra(EXTRA_TOKEN, token)
            return PendingIntent.getBroadcast(
                context, token.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        fun schedule(context: Context, token: String) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + TIMEOUT_MS, pendingIntent(context, token))
        }

        fun cancel(context: Context, token: String) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.cancel(pendingIntent(context, token))
        }
    }
}
