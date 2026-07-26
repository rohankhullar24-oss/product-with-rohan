package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/**
 * Simple JSON-file persistence. The data set is tiny (personal reminders), so
 * a single file read/written under a lock is simpler and more robust than a
 * database, and receivers can use it synchronously.
 */
object ReminderStore {

    private const val FILE_NAME = "reminders.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<Reminder> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { Reminder.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): Reminder? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, reminder: Reminder) = synchronized(lock) {
        val list = getAll(context).filter { it.id != reminder.id } + reminder
        save(context, list)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    /** Replaces the whole store, e.g. with a merged list after a cloud sync. */
    fun replaceAll(context: Context, list: List<Reminder>) = synchronized(lock) {
        save(context, list)
    }

    /** Pretty-printed JSON of all reminders, for the user-facing backup file. */
    fun exportJson(context: Context): String = synchronized(lock) {
        val arr = JSONArray()
        getAll(context).forEach { arr.put(it.toJson()) }
        arr.toString(2)
    }

    /** Replaces the whole store with the parsed backup; throws if it's invalid. */
    fun importJson(context: Context, text: String): List<Reminder> = synchronized(lock) {
        val arr = JSONArray(text)
        val list = (0 until arr.length()).map { Reminder.fromJson(arr.getJSONObject(it)) }
        save(context, list)
        list
    }

    private fun save(context: Context, list: List<Reminder>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        val f = file(context)
        val tmp = File(f.parentFile, "$FILE_NAME.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(f)
    }
}
