package online.productwithrohan.reminders

import android.content.Context
import java.time.ZonedDateTime

/**
 * Records the outcome of one fire of an [AutoTask]. A ONE_TIME task goes
 * terminal (DONE/FAILED); a recurring one stays PENDING and gets rescheduled
 * to its next occurrence instead, with the outcome tracked in
 * [AutoTask.lastFiredAt]/[AutoTask.lastResult] — mirrors how a recurring
 * [Reminder] never "completes", it just keeps ringing on schedule.
 *
 * Shared by [AutoTaskAlarmReceiver] (sync channels), [AutoTextAccessibilityService]
 * (WhatsApp send success) and [PendingActionWatchdogReceiver] (WhatsApp send
 * timeout) so all three fire-completion paths reschedule the same way.
 */
object AutoTaskFireRecorder {

    fun recordFire(context: Context, task: AutoTask, success: Boolean, reason: String?) {
        // The task resolved one way or another, so any lock-unlock retry chain for it is done.
        AutoTaskLockRetryReceiver.cancel(context, task.id)

        val now = System.currentTimeMillis()
        task.lastFiredAt = now
        task.lastResult = if (success) "Sent" else (reason ?: "Failed")

        if (task.recurrence == AutoRecurrence.ONE_TIME) {
            task.status = if (success) AutoTaskStatus.DONE else AutoTaskStatus.FAILED
            task.failureReason = if (success) null else reason
        } else {
            task.status = AutoTaskStatus.PENDING
            task.failureReason = null
            val next = task.nextOccurrence(ZonedDateTime.now())
            if (next != null) {
                task.scheduledAt = next.toInstant().toEpochMilli()
                AutoTaskAlarmScheduler.schedule(context, task)
            }
        }
        task.updatedAt = now
        AutoTaskStore.upsert(context, task)
    }
}
