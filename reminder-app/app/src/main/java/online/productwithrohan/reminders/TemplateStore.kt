package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** Same JSON-file-under-lock pattern as [ReminderStore] / [AutoTaskStore]. */
object TemplateStore {

    private const val FILE_NAME = "templates.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<Template> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { Template.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): Template? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, template: Template) = synchronized(lock) {
        template.updatedAt = System.currentTimeMillis()
        val all = getAll(context).filter { it.id != template.id } + template
        save(context, all)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    /** Replaces the whole store, e.g. with a merged list after a cloud sync. */
    fun replaceAll(context: Context, list: List<Template>) = synchronized(lock) {
        save(context, list)
    }

    private fun save(context: Context, list: List<Template>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        file(context).writeText(arr.toString())
    }
}
