package online.productwithrohan.reminders

import org.json.JSONObject
import java.time.LocalDate
import java.util.UUID

/**
 * A trip being planned: a name plus a date range. Its stops live separately
 * in [ItineraryStopStore], linked by [ItineraryStop.tripId].
 */
data class ItineraryTrip(
    val id: String = UUID.randomUUID().toString(),
    var name: String = "",
    /** ISO date "2026-03-12" */
    var startDate: String = LocalDate.now().toString(),
    var endDate: String = LocalDate.now().toString(),
    var notes: String = "",
    var updatedAt: Long = System.currentTimeMillis(),
) {
    fun start(): LocalDate = LocalDate.parse(startDate)
    fun end(): LocalDate = LocalDate.parse(endDate)

    /** Whether the trip has any day left today or in the future. */
    fun isUpcoming(today: LocalDate = LocalDate.now()): Boolean = !end().isBefore(today)

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("startDate", startDate)
        put("endDate", endDate)
        put("notes", notes)
        put("updatedAt", updatedAt)
    }

    companion object {
        fun fromJson(o: JSONObject): ItineraryTrip = ItineraryTrip(
            id = o.getString("id"),
            name = o.optString("name"),
            startDate = o.optString("startDate", LocalDate.now().toString()),
            endDate = o.optString("endDate", LocalDate.now().toString()),
            notes = o.optString("notes"),
            updatedAt = o.optLong("updatedAt", 0L),
        )
    }
}
