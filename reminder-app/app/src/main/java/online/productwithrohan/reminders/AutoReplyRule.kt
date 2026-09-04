package online.productwithrohan.reminders

import org.json.JSONObject
import java.util.UUID

/** A custom reply message for one specific WhatsApp sender, overriding the global reply. */
data class AutoReplyRule(
    val id: String = UUID.randomUUID().toString(),
    var senderName: String = "",
    var message: String = "",
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("senderName", senderName)
        put("message", message)
    }

    companion object {
        fun fromJson(o: JSONObject) = AutoReplyRule(
            id = o.getString("id"),
            senderName = o.optString("senderName"),
            message = o.optString("message"),
        )
    }
}
