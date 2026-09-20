package online.productwithrohan.reminders

import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

/**
 * A single journal entry: free-form personal text plus optional attachments.
 * Attachments are filenames under [JournalMediaStore]'s encrypted media
 * directory, not full paths, so they stay meaningful if the JSON is ever
 * moved. The entry's cloud copy (text/location/media, via [JournalMediaStore]
 * uploading to the `journal-media` Supabase Storage bucket) is scoped to the
 * signed-in user, so opening the Journal on a second signed-in device pulls
 * both.
 */
data class JournalEntry(
    val id: String = UUID.randomUUID().toString(),
    var text: String = "",
    /** Encrypted attachment filenames under the journal_media/ directory. */
    var photoFile: String? = null,
    var videoFile: String? = null,
    var audioFile: String? = null,
    var latitude: Double? = null,
    var longitude: Double? = null,
    var placeName: String? = null,
    var createdAt: Long = System.currentTimeMillis(),
    /**
     * ISO date "2026-03-14" this entry is *about* -- editable independently
     * of [createdAt], so a past or future day can be journaled for. Defaults
     * to the day the entry was created.
     */
    var entryDate: String = Instant.ofEpochMilli(System.currentTimeMillis()).atZone(ZoneId.systemDefault()).toLocalDate().toString(),
    /** Epoch millis of the last local edit; used for last-write-wins sync. */
    var updatedAt: Long = System.currentTimeMillis(),
) {
    fun hasLocation(): Boolean = latitude != null && longitude != null

    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("text", text)
        .put("photoFile", photoFile ?: JSONObject.NULL)
        .put("videoFile", videoFile ?: JSONObject.NULL)
        .put("audioFile", audioFile ?: JSONObject.NULL)
        .put("latitude", latitude ?: JSONObject.NULL)
        .put("longitude", longitude ?: JSONObject.NULL)
        .put("placeName", placeName ?: JSONObject.NULL)
        .put("createdAt", createdAt)
        .put("entryDate", entryDate)
        .put("updatedAt", updatedAt)

    companion object {
        fun fromJson(o: JSONObject): JournalEntry {
            val createdAt = o.optLong("createdAt", 0L)
            // Entries written before entryDate existed fall back to their createdAt day.
            val fallbackDate = Instant.ofEpochMilli(if (createdAt > 0L) createdAt else System.currentTimeMillis())
                .atZone(ZoneId.systemDefault()).toLocalDate().toString()
            return JournalEntry(
                id = o.getString("id"),
                text = o.optString("text"),
                photoFile = if (o.isNull("photoFile")) null else o.optString("photoFile"),
                videoFile = if (o.isNull("videoFile")) null else o.optString("videoFile"),
                audioFile = if (o.isNull("audioFile")) null else o.optString("audioFile"),
                latitude = if (o.has("latitude") && !o.isNull("latitude")) o.optDouble("latitude") else null,
                longitude = if (o.has("longitude") && !o.isNull("longitude")) o.optDouble("longitude") else null,
                placeName = if (o.isNull("placeName")) null else o.optString("placeName"),
                createdAt = createdAt,
                entryDate = if (o.has("entryDate") && !o.isNull("entryDate")) o.optString("entryDate") else fallbackDate,
                updatedAt = o.optLong("updatedAt", 0L),
            )
        }
    }
}
