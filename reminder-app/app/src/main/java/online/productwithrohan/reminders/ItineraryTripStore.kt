package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** JSON-file persistence for trips, same shape as [ReminderStore]. */
object ItineraryTripStore {

    private const val FILE_NAME = "itinerary_trips.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<ItineraryTrip> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { ItineraryTrip.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): ItineraryTrip? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, trip: ItineraryTrip) = synchronized(lock) {
        val list = getAll(context).filter { it.id != trip.id } + trip
        save(context, list)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    fun replaceAll(context: Context, list: List<ItineraryTrip>) = synchronized(lock) {
        save(context, list)
    }

    fun exportJson(context: Context): String = synchronized(lock) {
        val arr = JSONArray()
        getAll(context).forEach { arr.put(it.toJson()) }
        arr.toString(2)
    }

    fun importJson(context: Context, text: String): List<ItineraryTrip> = synchronized(lock) {
        val arr = JSONArray(text)
        val list = (0 until arr.length()).map { ItineraryTrip.fromJson(arr.getJSONObject(it)) }
        save(context, list)
        list
    }

    private fun save(context: Context, list: List<ItineraryTrip>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        val f = file(context)
        val tmp = File(f.parentFile, "$FILE_NAME.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(f)
    }
}
