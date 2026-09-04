package online.productwithrohan.reminders

import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * A scheduled WhatsApp task can't be sent while the device is locked —
 * WhatsApp's UI isn't drivable — so instead of failing, [WhatsAppSender]
 * reports [WhatsAppSender.Result.WaitingForUnlock] and this receiver polls
 * every [RETRY_INTERVAL_MS] until the keyguard is unlocked, then retries the
 * send. Only stops retrying once the task actually sends (or hits a real
 * failure unrelated to being locked, e.g. WhatsApp not installed).
 */
class AutoTaskLockRetryReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
        val task = AutoTaskStore.get(context, taskId) ?: return
        if (task.status != AutoTaskStatus.PENDING) return

        val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (keyguard.isKeyguardLocked) {
            scheduleRetry(context, taskId)
            return
        }

        val message = AutoSchedulerSettings.applyWhatsAppSignature(context, task.message)
        when (val result = WhatsAppSender.sendPrefilled(context, task.recipient, message, PendingActionKind.TASK, task.id)) {
            WhatsAppSender.Result.Started -> {}
            WhatsAppSender.Result.WaitingForUnlock -> scheduleRetry(context, taskId)
            WhatsAppSender.Result.AccessibilityNotEnabled ->
                AutoTaskFireRecorder.recordFire(context, task, false, "Auto Text accessibility permission not granted")
            WhatsAppSender.Result.NotInstalled ->
                AutoTaskFireRecorder.recordFire(context, task, false, "WhatsApp isn't installed")
            WhatsAppSender.Result.NoRecipient ->
                AutoTaskFireRecorder.recordFire(context, task, false, "No recipient number")
            is WhatsAppSender.Result.Error -> AutoTaskFireRecorder.recordFire(context, task, false, result.message)
        }
    }

    companion object {
        const val EXTRA_TASK_ID = "lock_retry_task_id"
        private const val RETRY_INTERVAL_MS = 60_000L

        private fun pendingIntent(context: Context, taskId: String): PendingIntent {
            val intent = Intent(context, AutoTaskLockRetryReceiver::class.java)
                .putExtra(EXTRA_TASK_ID, taskId)
            return PendingIntent.getBroadcast(
                context, (taskId.hashCode() and 0x7FFFFFF8) + 3, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        fun scheduleRetry(context: Context, taskId: String) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + RETRY_INTERVAL_MS, pendingIntent(context, taskId))
        }

        fun cancel(context: Context, taskId: String) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.cancel(pendingIntent(context, taskId))
        }
    }
}
