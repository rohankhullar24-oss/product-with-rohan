package online.productwithrohan.reminders

import org.json.JSONObject
import java.util.UUID

/** A reusable named message body, dropped into a scheduled task's message field. */
data class Template(
    val id: String = UUID.randomUUID().toString(),
    var name: String = "",
    var message: String = "",
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("message", message)
    }

    companion object {
        fun fromJson(o: JSONObject) = Template(
            id = o.getString("id"),
            name = o.optString("name"),
            message = o.optString("message"),
        )
    }
}
