package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** JSON-file persistence for notes, same shape as [ItineraryStopStore]. */
object NoteStore {

    private const val FILE_NAME = "notes.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<Note> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { Note.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): Note? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, note: Note) = synchronized(lock) {
        val list = getAll(context).filter { it.id != note.id } + note
        save(context, list)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    fun replaceAll(context: Context, list: List<Note>) = synchronized(lock) {
        save(context, list)
    }

    private fun save(context: Context, list: List<Note>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        val f = file(context)
        val tmp = File(f.parentFile, "$FILE_NAME.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(f)
    }
}
