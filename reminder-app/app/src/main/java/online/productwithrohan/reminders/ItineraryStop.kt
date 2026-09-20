package online.productwithrohan.reminders

import org.json.JSONObject
import java.time.LocalDate
import java.util.UUID

/**
 * One planned stop/activity within a trip, on a specific day. [time] is
 * optional (zero-or-one, unlike [Reminder.timesOfDay]) — this is a visual
 * plan, not something that schedules an alarm.
 */
data class ItineraryStop(
    val id: String = UUID.randomUUID().toString(),
    var tripId: String = "",
    /** ISO date "2026-03-14" — the day this stop belongs to */
    var date: String = LocalDate.now().toString(),
    /** "HH:mm", optional */
    var time: String? = null,
    var title: String = "",
    var location: String = "",
    var notes: String = "",
    var updatedAt: Long = System.currentTimeMillis(),
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("tripId", tripId)
        put("date", date)
        put("time", time ?: JSONObject.NULL)
        put("title", title)
        put("location", location)
        put("notes", notes)
        put("updatedAt", updatedAt)
    }

    companion object {
        fun fromJson(o: JSONObject): ItineraryStop = ItineraryStop(
            id = o.getString("id"),
            tripId = o.optString("tripId"),
            date = o.optString("date", LocalDate.now().toString()),
            time = if (o.isNull("time") || !o.has("time")) null else o.optString("time"),
            title = o.optString("title"),
            location = o.optString("location"),
            notes = o.optString("notes"),
            updatedAt = o.optLong("updatedAt", 0L),
        )

        /** Same-day ordering: timed stops first (earliest first), untimed stops last, tie-break by title. */
        val DAY_ORDER = compareBy<ItineraryStop>({ it.time == null }, { it.time }, { it.title })
    }
}
