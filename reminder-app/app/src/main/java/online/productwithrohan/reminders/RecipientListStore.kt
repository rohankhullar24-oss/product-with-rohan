package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** Same JSON-file-under-lock pattern as [ReminderStore] / [AutoTaskStore]. */
object RecipientListStore {

    private const val FILE_NAME = "recipient_lists.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<RecipientList> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { RecipientList.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): RecipientList? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, list: RecipientList) = synchronized(lock) {
        val all = getAll(context).filter { it.id != list.id } + list
        save(context, all)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    private fun save(context: Context, list: List<RecipientList>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        file(context).writeText(arr.toString())
    }
}
