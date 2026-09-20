package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import java.io.File

/** JSON-file persistence for stops, same shape as [ReminderStore]. */
object ItineraryStopStore {

    private const val FILE_NAME = "itinerary_stops.json"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun getAll(context: Context): List<ItineraryStop> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { ItineraryStop.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): ItineraryStop? =
        getAll(context).firstOrNull { it.id == id }

    fun getForTrip(context: Context, tripId: String): List<ItineraryStop> =
        getAll(context).filter { it.tripId == tripId }

    fun getForDate(context: Context, tripId: String, date: String): List<ItineraryStop> =
        getForTrip(context, tripId).filter { it.date == date }.sortedWith(ItineraryStop.DAY_ORDER)

    fun upsert(context: Context, stop: ItineraryStop) = synchronized(lock) {
        val list = getAll(context).filter { it.id != stop.id } + stop
        save(context, list)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    fun deleteForTrip(context: Context, tripId: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.tripId != tripId })
    }

    fun replaceAll(context: Context, list: List<ItineraryStop>) = synchronized(lock) {
        save(context, list)
    }

    fun exportJson(context: Context): String = synchronized(lock) {
        val arr = JSONArray()
        getAll(context).forEach { arr.put(it.toJson()) }
        arr.toString(2)
    }

    fun importJson(context: Context, text: String): List<ItineraryStop> = synchronized(lock) {
        val arr = JSONArray(text)
        val list = (0 until arr.length()).map { ItineraryStop.fromJson(arr.getJSONObject(it)) }
        save(context, list)
        list
    }

    private fun save(context: Context, list: List<ItineraryStop>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        val f = file(context)
        val tmp = File(f.parentFile, "$FILE_NAME.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(f)
    }
}
