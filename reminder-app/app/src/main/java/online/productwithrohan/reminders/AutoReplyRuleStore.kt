package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** Same JSON-file-under-lock pattern as [ReminderStore] / [AutoTaskStore] / [TemplateStore]. */
object AutoReplyRuleStore {

    private const val FILE_NAME = "auto_reply_rules.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<AutoReplyRule> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { AutoReplyRule.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): AutoReplyRule? =
        getAll(context).firstOrNull { it.id == id }

    /** The custom rule whose sender name matches [senderName], if any — case/whitespace insensitive. */
    fun findFor(context: Context, senderName: String): AutoReplyRule? {
        val normalized = senderName.trim().lowercase()
        if (normalized.isBlank()) return null
        return getAll(context).firstOrNull { it.senderName.trim().lowercase() == normalized }
    }

    fun upsert(context: Context, rule: AutoReplyRule) = synchronized(lock) {
        val all = getAll(context).filter { it.id != rule.id } + rule
        save(context, all)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    private fun save(context: Context, list: List<AutoReplyRule>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        file(context).writeText(arr.toString())
    }
}
