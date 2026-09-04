package online.productwithrohan.reminders

import android.content.Context
import java.time.ZonedDateTime

/**
 * Records the outcome of one fire of an [AutoTask]:
 * - Recurring (DAILY/WEEKDAYS) tasks stay PENDING and get rescheduled to
 *   their next occurrence — mirrors how a recurring [Reminder] never
 *   "completes", it just keeps ringing on schedule.
 * - A ONE_TIME task that fails with [AutoTask.retryOnFailure] set stays
 *   PENDING too and gets rescheduled [RETRY_DELAY_MS] out, up to
 *   [MAX_AUTO_RETRIES] attempts — set from the composer at scheduling time,
 *   not asked about after the fact.
 * - Anything else (a ONE_TIME success, or a ONE_TIME failure with retry off
 *   or exhausted) goes terminal (DONE/FAILED).
 *
 * Either way the outcome is tracked in [AutoTask.lastFiredAt]/[AutoTask.lastResult].
 * Shared by [AutoTaskAlarmReceiver] (sync channels), [AutoTextAccessibilityService]
 * (WhatsApp send success) and [PendingActionWatchdogReceiver] (WhatsApp send
 * timeout) so all three fire-completion paths reschedule the same way.
 */
object AutoTaskFireRecorder {

    const val MAX_AUTO_RETRIES = 5
    private const val RETRY_DELAY_MS = 60_000L

    fun recordFire(context: Context, task: AutoTask, success: Boolean, reason: String?) {
        // The task resolved one way or another, so any lock-unlock retry chain for it is done.
        AutoTaskLockRetryReceiver.cancel(context, task.id)

        val now = System.currentTimeMillis()
        task.lastFiredAt = now
        task.lastResult = if (success) "Sent" else (reason ?: "Failed")

        when {
            task.recurrence != AutoRecurrence.ONE_TIME -> {
                task.status = AutoTaskStatus.PENDING
                task.failureReason = null
                val next = task.nextOccurrence(ZonedDateTime.now())
                if (next != null) {
                    task.scheduledAt = next.toInstant().toEpochMilli()
                    AutoTaskAlarmScheduler.schedule(context, task)
                }
            }
            success -> {
                task.status = AutoTaskStatus.DONE
                task.failureReason = null
            }
            task.retryOnFailure && task.retryCount < MAX_AUTO_RETRIES -> {
                task.retryCount += 1
                task.status = AutoTaskStatus.PENDING
                task.failureReason = null
                task.scheduledAt = now + RETRY_DELAY_MS
                AutoTaskAlarmScheduler.schedule(context, task)
            }
            else -> {
                task.status = AutoTaskStatus.FAILED
                task.failureReason = reason
                if (AutoSchedulerSettings.notifyOnFailure(context)) {
                    AutoTextNotify.show(
                        context,
                        context.getString(R.string.auto_task_failed_title, task.displayTitle()),
                        reason ?: context.getString(R.string.auto_task_status_failed),
                    )
                }
            }
        }
        task.updatedAt = now
        AutoTaskStore.upsert(context, task)
    }
}
