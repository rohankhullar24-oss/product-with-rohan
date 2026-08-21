package online.productwithrohan.reminders

import org.json.JSONObject
import java.util.UUID

/**
 * A single journal entry: free-form personal text plus optional attachments.
 * Attachments are filenames under [JournalMediaStore]'s encrypted media
 * directory, not full paths, so they stay meaningful if the JSON is ever
 * moved. They're device-local only — [JournalSyncManager] pushes this same
 * payload to the cloud for the text/location fields, but the referenced
 * media files themselves never leave the device, so an entry opened on a
 * second device shows its text/location but not its photo/video/audio until
 * that's added.
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
        .put("updatedAt", updatedAt)

    companion object {
        fun fromJson(o: JSONObject): JournalEntry = JournalEntry(
            id = o.getString("id"),
            text = o.optString("text"),
            photoFile = if (o.isNull("photoFile")) null else o.optString("photoFile"),
            videoFile = if (o.isNull("videoFile")) null else o.optString("videoFile"),
            audioFile = if (o.isNull("audioFile")) null else o.optString("audioFile"),
            latitude = if (o.has("latitude") && !o.isNull("latitude")) o.optDouble("latitude") else null,
            longitude = if (o.has("longitude") && !o.isNull("longitude")) o.optDouble("longitude") else null,
            placeName = if (o.isNull("placeName")) null else o.optString("placeName"),
            createdAt = o.optLong("createdAt", 0L),
            updatedAt = o.optLong("updatedAt", 0L),
        )
    }
}
