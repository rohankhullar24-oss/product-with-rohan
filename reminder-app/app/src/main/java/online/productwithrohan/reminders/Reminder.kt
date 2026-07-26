package online.productwithrohan.reminders

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

enum class ReminderType { ONE_TIME, DAILY, WEEKLY, MONTHLY, YEARLY }

/**
 * A reminder. Recurrence is defined by [type] plus the matching date fields;
 * [timesOfDay] holds the HH:mm slots it fires at on an occurrence day (this is
 * the "remind me 4 or 5 times a day" setting). [nagIntervalMinutes] controls
 * how often an unacknowledged notification re-fires until the user taps Done.
 */
data class Reminder(
    val id: String = UUID.randomUUID().toString(),
    var title: String = "",
    var notes: String = "",
    var type: ReminderType = ReminderType.ONE_TIME,
    /** ISO date "2026-08-02", used when type == ONE_TIME */
    var oneTimeDate: String? = null,
    /** 1=Mon .. 7=Sun, used when type == WEEKLY */
    var daysOfWeek: MutableSet<Int> = mutableSetOf(),
    /** 1..31, used when type == MONTHLY (clamped to month length) */
    var dayOfMonth: Int = 1,
    /** 1..12 and 1..31, used when type == YEARLY (day clamped, so Feb 29 works) */
    var month: Int = 1,
    var day: Int = 1,
    /** "HH:mm" slots on an occurrence day, at least one */
    var timesOfDay: MutableList<String> = mutableListOf(),
    /** 0 = never re-nag; otherwise re-notify every N minutes until Done */
    var nagIntervalMinutes: Int = 30,
    var enabled: Boolean = true,
    /** ONE_TIME only: user confirmed done, reminder is finished */
    var completed: Boolean = false,
    /** ISO date of the occurrence day the user last confirmed Done */
    var doneForDay: String? = null,
    /** ISO date of the occurrence day currently being nagged, null when quiet */
    var activeNagDay: String? = null,
) {

    fun occursOn(d: LocalDate): Boolean = when (type) {
        ReminderType.ONE_TIME -> d.toString() == oneTimeDate
        ReminderType.DAILY -> true
        ReminderType.WEEKLY -> daysOfWeek.contains(d.dayOfWeek.value)
        ReminderType.MONTHLY -> d.dayOfMonth == minOf(dayOfMonth, d.lengthOfMonth())
        ReminderType.YEARLY -> d.monthValue == month && d.dayOfMonth == minOf(day, d.lengthOfMonth())
    }

    /** Next slot strictly after [now], skipping days already confirmed Done. */
    fun nextTrigger(now: ZonedDateTime = ZonedDateTime.now()): ZonedDateTime? {
        if (!enabled || completed || timesOfDay.isEmpty()) return null
        val today = now.toLocalDate()
        val sorted = timesOfDay.sorted()
        // 800 days covers every recurrence gap (yearly incl. Feb 29 handling)
        for (offset in 0..800L) {
            val d = today.plusDays(offset)
            if (!occursOn(d)) continue
            if (doneForDay == d.toString()) continue
            for (t in sorted) {
                val dt = ZonedDateTime.of(d, LocalTime.parse(t), now.zone)
                if (dt.isAfter(now)) return dt
            }
        }
        return null
    }

    fun scheduleLabel(): String {
        val typeLabel = when (type) {
            ReminderType.ONE_TIME -> oneTimeDate?.let {
                LocalDate.parse(it).format(DateTimeFormatter.ofPattern("d MMM yyyy"))
            } ?: "One time"
            ReminderType.DAILY -> "Every day"
            ReminderType.WEEKLY -> {
                val names = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                "Every " + daysOfWeek.sorted().joinToString(", ") { names[it - 1] }
            }
            ReminderType.MONTHLY -> "Monthly on day $dayOfMonth"
            ReminderType.YEARLY -> "Every year on " +
                LocalDate.of(2024, month, minOf(day, LocalDate.of(2024, month, 1).lengthOfMonth()))
                    .format(DateTimeFormatter.ofPattern("d MMM"))
        }
        val times = if (timesOfDay.size == 1) "at ${timesOfDay[0]}"
        else "${timesOfDay.size}×/day (${timesOfDay.sorted().joinToString(", ")})"
        return "$typeLabel · $times"
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("title", title)
        put("notes", notes)
        put("type", type.name)
        put("oneTimeDate", oneTimeDate ?: JSONObject.NULL)
        put("daysOfWeek", JSONArray(daysOfWeek.toList()))
        put("dayOfMonth", dayOfMonth)
        put("month", month)
        put("day", day)
        put("timesOfDay", JSONArray(timesOfDay))
        put("nagIntervalMinutes", nagIntervalMinutes)
        put("enabled", enabled)
        put("completed", completed)
        put("doneForDay", doneForDay ?: JSONObject.NULL)
        put("activeNagDay", activeNagDay ?: JSONObject.NULL)
    }

    companion object {
        fun fromJson(o: JSONObject): Reminder {
            val days = mutableSetOf<Int>()
            val daysArr = o.optJSONArray("daysOfWeek") ?: JSONArray()
            for (i in 0 until daysArr.length()) days.add(daysArr.getInt(i))
            val times = mutableListOf<String>()
            val timesArr = o.optJSONArray("timesOfDay") ?: JSONArray()
            for (i in 0 until timesArr.length()) times.add(timesArr.getString(i))
            return Reminder(
                id = o.getString("id"),
                title = o.optString("title"),
                notes = o.optString("notes"),
                type = ReminderType.valueOf(o.optString("type", ReminderType.ONE_TIME.name)),
                oneTimeDate = if (o.isNull("oneTimeDate")) null else o.getString("oneTimeDate"),
                daysOfWeek = days,
                dayOfMonth = o.optInt("dayOfMonth", 1),
                month = o.optInt("month", 1),
                day = o.optInt("day", 1),
                timesOfDay = times,
                nagIntervalMinutes = o.optInt("nagIntervalMinutes", 30),
                enabled = o.optBoolean("enabled", true),
                completed = o.optBoolean("completed", false),
                doneForDay = if (o.isNull("doneForDay")) null else o.getString("doneForDay"),
                activeNagDay = if (o.isNull("activeNagDay")) null else o.getString("activeNagDay"),
            )
        }

        fun zone(): ZoneId = ZoneId.systemDefault()
    }
}
