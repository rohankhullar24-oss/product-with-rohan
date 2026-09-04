package online.productwithrohan.reminders

import org.json.JSONObject
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.ZonedDateTime
import java.util.UUID

/**
 * All channels the Auto Scheduler UI offers. Only [SMS], [CALL], [REMINDER],
 * [WHATSAPP] and [FAKE_CALL] are wired to an actual sender so far (see
 * [AutoTaskAlarmReceiver.dispatch]); the rest exist here so the task model
 * and picker don't need to change shape when they're added.
 */
enum class AutoTaskChannel { SMS, WHATSAPP, TELEGRAM, EMAIL, REMINDER, CALL, FAKE_CALL }

enum class AutoTaskStatus { PENDING, DONE, FAILED }

/** ONE_TIME fires once and goes terminal (DONE/FAILED); DAILY/WEEKDAYS keep firing at [timeOfDay]. */
enum class AutoRecurrence { ONE_TIME, DAILY, WEEKDAYS }

/**
 * A scheduled action (message, call, or reminder) fired by
 * [AutoTaskAlarmReceiver] at [scheduledAt]. A ONE_TIME task fires once and
 * moves to DONE/FAILED; a DAILY/WEEKDAYS task stays PENDING forever and
 * reschedules itself after each fire (see [AutoTaskFireRecorder]) — its
 * outcome is tracked in [lastFiredAt]/[lastResult] instead.
 */
data class AutoTask(
    val id: String = UUID.randomUUID().toString(),
    var channel: AutoTaskChannel = AutoTaskChannel.SMS,
    /** Phone number (SMS/CALL/WHATSAPP) or comma-separated recipients; unused for REMINDER/FAKE_CALL. */
    var recipient: String = "",
    /** SMS/WhatsApp body or reminder notes, depending on channel. */
    var message: String = "",
    /** Reminder title / fake-caller name; also shown as the task's label. */
    var label: String = "",
    /** Epoch millis this task is next due to fire. */
    var scheduledAt: Long = 0L,
    var recurrence: AutoRecurrence = AutoRecurrence.ONE_TIME,
    /** "HH:mm", only meaningful when [recurrence] != ONE_TIME. */
    var timeOfDay: String? = null,
    var status: AutoTaskStatus = AutoTaskStatus.PENDING,
    /** Set when status == FAILED (ONE_TIME only), shown in the list. */
    var failureReason: String? = null,
    /** Epoch millis of the last time this task fired, recurring tasks only. */
    var lastFiredAt: Long? = null,
    /** "Sent" or a failure reason from the last fire, recurring tasks only. */
    var lastResult: String? = null,
    var updatedAt: Long = System.currentTimeMillis(),
) {

    /** What the task list shows as its title, since REMINDER/FAKE_CALL have no recipient. */
    fun displayTitle(): String = label.ifBlank { recipient.ifBlank { channel.name } }

    /** Next occurrence strictly after [from], or null for ONE_TIME (that's just [scheduledAt] itself). */
    fun nextOccurrence(from: ZonedDateTime = ZonedDateTime.now()): ZonedDateTime? {
        if (recurrence == AutoRecurrence.ONE_TIME) return null
        val time = timeOfDay?.let { runCatching { LocalTime.parse(it) }.getOrNull() } ?: return null
        for (offset in 0..7L) {
            val date = from.toLocalDate().plusDays(offset)
            if (recurrence == AutoRecurrence.WEEKDAYS &&
                (date.dayOfWeek == DayOfWeek.SATURDAY || date.dayOfWeek == DayOfWeek.SUNDAY)
            ) continue
            val candidate = ZonedDateTime.of(date, time, from.zone)
            if (candidate.isAfter(from)) return candidate
        }
        return null
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("channel", channel.name)
        put("recipient", recipient)
        put("message", message)
        put("label", label)
        put("scheduledAt", scheduledAt)
        put("recurrence", recurrence.name)
        put("timeOfDay", timeOfDay ?: JSONObject.NULL)
        put("status", status.name)
        put("failureReason", failureReason ?: JSONObject.NULL)
        put("lastFiredAt", lastFiredAt ?: JSONObject.NULL)
        put("lastResult", lastResult ?: JSONObject.NULL)
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
            recurrence = runCatching { AutoRecurrence.valueOf(o.optString("recurrence", AutoRecurrence.ONE_TIME.name)) }
                .getOrDefault(AutoRecurrence.ONE_TIME),
            timeOfDay = if (o.isNull("timeOfDay") || !o.has("timeOfDay")) null else o.optString("timeOfDay"),
            status = AutoTaskStatus.valueOf(o.optString("status", AutoTaskStatus.PENDING.name)),
            failureReason = if (o.isNull("failureReason")) null else o.optString("failureReason"),
            lastFiredAt = if (o.isNull("lastFiredAt") || !o.has("lastFiredAt")) null else o.optLong("lastFiredAt"),
            lastResult = if (o.isNull("lastResult") || !o.has("lastResult")) null else o.optString("lastResult"),
            updatedAt = o.optLong("updatedAt", 0L),
        )
    }
}
