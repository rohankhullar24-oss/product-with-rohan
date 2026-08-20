package online.productwithrohan.reminders

import org.json.JSONObject
import java.util.UUID

/** A single journal entry: free-form personal text plus timestamps for sync. */
data class JournalEntry(
    val id: String = UUID.randomUUID().toString(),
    var text: String = "",
    var createdAt: Long = System.currentTimeMillis(),
    /** Epoch millis of the last local edit; used for last-write-wins sync. */
    var updatedAt: Long = System.currentTimeMillis(),
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("text", text)
        .put("createdAt", createdAt)
        .put("updatedAt", updatedAt)

    companion object {
        fun fromJson(o: JSONObject): JournalEntry = JournalEntry(
            id = o.getString("id"),
            text = o.optString("text"),
            createdAt = o.optLong("createdAt", 0L),
            updatedAt = o.optLong("updatedAt", 0L),
        )
    }
}
