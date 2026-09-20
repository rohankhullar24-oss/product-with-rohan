package online.productwithrohan.reminders

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** One row of a checklist-type [Note]. */
data class ChecklistItem(
    val id: String = UUID.randomUUID().toString(),
    var text: String = "",
    var checked: Boolean = false,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("text", text)
        .put("checked", checked)

    companion object {
        fun fromJson(o: JSONObject): ChecklistItem = ChecklistItem(
            id = o.optString("id").takeIf { it.isNotBlank() } ?: UUID.randomUUID().toString(),
            text = o.optString("text", ""),
            checked = o.optBoolean("checked", false),
        )
    }
}

/**
 * A Google-Keep-style note: free text or a checklist, with an optional
 * color/pin/archive state and image/audio attachments. Attachments store
 * only opaque filenames into [NoteMediaStore], same indirection [JournalEntry]
 * uses for its own photo/video/audio fields — a Note never holds a raw path.
 */
data class Note(
    val id: String = UUID.randomUUID().toString(),
    var title: String = "",
    var body: String = "",
    var checklist: MutableList<ChecklistItem> = mutableListOf(),
    var isChecklist: Boolean = false,
    var color: String = COLOR_DEFAULT,
    var pinned: Boolean = false,
    var archived: Boolean = false,
    var images: MutableList<String> = mutableListOf(),
    var audio: MutableList<String> = mutableListOf(),
    var createdAt: Long = System.currentTimeMillis(),
    var updatedAt: Long = System.currentTimeMillis(),
) {
    fun isEmpty(): Boolean =
        title.isBlank() && body.isBlank() && checklist.isEmpty() && images.isEmpty() && audio.isEmpty()

    fun toJson(): JSONObject {
        val checklistArr = JSONArray()
        checklist.forEach { checklistArr.put(it.toJson()) }
        val imagesArr = JSONArray()
        images.forEach { imagesArr.put(it) }
        val audioArr = JSONArray()
        audio.forEach { audioArr.put(it) }
        return JSONObject()
            .put("id", id)
            .put("title", title)
            .put("body", body)
            .put("checklist", checklistArr)
            .put("isChecklist", isChecklist)
            .put("color", color)
            .put("pinned", pinned)
            .put("archived", archived)
            .put("images", imagesArr)
            .put("audio", audioArr)
            .put("createdAt", createdAt)
            .put("updatedAt", updatedAt)
    }

    companion object {
        const val COLOR_DEFAULT = "default"

        /** Fixed Keep-like palette; UI maps each key to an actual color via NoteColors. */
        val PALETTE = listOf(
            COLOR_DEFAULT, "red", "orange", "yellow", "green",
            "teal", "blue", "dark_blue", "purple", "pink", "brown", "gray",
        )

        fun fromJson(o: JSONObject): Note {
            val checklist = mutableListOf<ChecklistItem>()
            o.optJSONArray("checklist")?.let { arr ->
                for (i in 0 until arr.length()) checklist.add(ChecklistItem.fromJson(arr.getJSONObject(i)))
            }
            val images = mutableListOf<String>()
            o.optJSONArray("images")?.let { arr ->
                for (i in 0 until arr.length()) images.add(arr.getString(i))
            }
            val audio = mutableListOf<String>()
            o.optJSONArray("audio")?.let { arr ->
                for (i in 0 until arr.length()) audio.add(arr.getString(i))
            }
            return Note(
                id = o.getString("id"),
                title = o.optString("title", ""),
                body = o.optString("body", ""),
                checklist = checklist,
                isChecklist = o.optBoolean("isChecklist", false),
                color = o.optString("color", COLOR_DEFAULT),
                pinned = o.optBoolean("pinned", false),
                archived = o.optBoolean("archived", false),
                images = images,
                audio = audio,
                createdAt = o.optLong("createdAt", 0L),
                updatedAt = o.optLong("updatedAt", 0L),
            )
        }
    }
}
