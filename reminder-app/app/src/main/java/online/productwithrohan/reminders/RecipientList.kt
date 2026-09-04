package online.productwithrohan.reminders

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** One (name, phone number) pair inside a [RecipientList]. */
data class RecipientEntry(
    var name: String = "",
    var phone: String = "",
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("name", name)
        put("phone", phone)
    }

    companion object {
        fun fromJson(o: JSONObject) = RecipientEntry(
            name = o.optString("name"),
            phone = o.optString("phone"),
        )
    }
}

/**
 * A reusable named group of recipients (the "Recipient Lists" feature), so a
 * scheduled SMS doesn't need its numbers retyped every time.
 */
data class RecipientList(
    val id: String = UUID.randomUUID().toString(),
    var name: String = "",
    var members: MutableList<RecipientEntry> = mutableListOf(),
) {
    /** Comma-separated numbers, ready to drop into an AutoTask's recipient field. */
    fun numbersJoined(): String = members.joinToString(", ") { it.phone }

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("members", JSONArray(members.map { it.toJson() }))
    }

    companion object {
        fun fromJson(o: JSONObject): RecipientList {
            val arr = o.optJSONArray("members") ?: JSONArray()
            val members = (0 until arr.length()).map { RecipientEntry.fromJson(arr.getJSONObject(it)) }
            return RecipientList(
                id = o.getString("id"),
                name = o.optString("name"),
                members = members.toMutableList(),
            )
        }
    }
}
