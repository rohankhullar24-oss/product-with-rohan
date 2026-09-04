package online.productwithrohan.reminders

import org.json.JSONObject
import java.util.UUID

/**
 * All channels the Auto Scheduler UI offers. Only [SMS], [CALL] and
 * [REMINDER] are wired to an actual sender so far (see
 * [AutoTaskAlarmReceiver.dispatch]); the rest exist here so the task model
 * and picker don't need to change shape when they're added.
 */
enum class AutoTaskChannel { SMS, WHATSAPP, TELEGRAM, EMAIL, REMINDER, CALL, FAKE_CALL }

enum class AutoTaskStatus { PENDING, DONE, FAILED }

/**
 * A one-off scheduled action (message, call, or reminder) fired by
 * [AutoTaskAlarmReceiver] at [scheduledAt]. Recurrence isn't modelled — each
 * task fires once and moves to DONE or FAILED, matching the Pending/Done/
 * Failed tabs in the Auto Scheduler screen.
 */
data class AutoTask(
    val id: String = UUID.randomUUID().toString(),
    var channel: AutoTaskChannel = AutoTaskChannel.SMS,
    /** Phone number (SMS/CALL) or comma-separated recipients; unused for REMINDER. */
    var recipient: String = "",
    /** SMS body / reminder notes, depending on channel. */
    var message: String = "",
    /** Reminder title, only meaningful for REMINDER; also shown as the task's label. */
    var label: String = "",
    /** Epoch millis this task is due to fire. */
    var scheduledAt: Long = 0L,
    var status: AutoTaskStatus = AutoTaskStatus.PENDING,
    /** Set when status == FAILED, shown in the list. */
    var failureReason: String? = null,
    var updatedAt: Long = System.currentTimeMillis(),
) {

    /** What the task list shows as its title, since REMINDER has no recipient. */
    fun displayTitle(): String = label.ifBlank { recipient.ifBlank { channel.name } }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("channel", channel.name)
        put("recipient", recipient)
        put("message", message)
        put("label", label)
        put("scheduledAt", scheduledAt)
        put("status", status.name)
        put("failureReason", failureReason ?: JSONObject.NULL)
        put("updatedAt", updatedAt)
    }

    companion object {
        fun fromJson(o: JSONObject): AutoTask = AutoTask(
            id = o.getString("id"),
            channel = AutoTaskChannel.valueOf(o.optString("channel", AutoTaskChannel.SMS.name)),
            recipient = o.optString("recipient"),
            message = o.optString("message"),
            label = o.optString("label"),
            scheduledAt = o.optLong("scheduledAt", 0L),
            status = AutoTaskStatus.valueOf(o.optString("status", AutoTaskStatus.PENDING.name)),
            failureReason = if (o.isNull("failureReason")) null else o.optString("failureReason"),
            updatedAt = o.optLong("updatedAt", 0L),
        )
    }
}
