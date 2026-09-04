package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** Same JSON-file-under-lock pattern as [ReminderStore], kept as a separate file/store. */
object AutoTaskStore {

    private const val FILE_NAME = "auto_tasks.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<AutoTask> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { AutoTask.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): AutoTask? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, task: AutoTask) = synchronized(lock) {
        val list = getAll(context).filter { it.id != task.id } + task
        save(context, list)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    private fun save(context: Context, list: List<AutoTask>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        file(context).writeText(arr.toString())
    }
}
