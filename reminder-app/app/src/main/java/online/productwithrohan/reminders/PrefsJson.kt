package online.productwithrohan.reminders

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Generic SharedPreferences <-> JSON round-trip, shared by [BackupManager] (the
 * user-facing export/import file) and [AutoSchedulerSyncManager] (the same
 * settings blobs mirrored to Supabase) so a settings screen gaining a new toggle
 * doesn't need updating in two places.
 */
object PrefsJson {

    fun toJson(prefs: SharedPreferences): JSONObject {
        val obj = JSONObject()
        for ((key, value) in prefs.all) {
            when (value) {
                is Boolean, is Int, is Long, is String -> obj.put(key, value)
                is Float -> obj.put(key, value.toDouble())
                is Set<*> -> {
                    val arr = JSONArray()
                    value.forEach { arr.put(it.toString()) }
                    obj.put(key, arr)
                }
                else -> {}
            }
        }
        return obj
    }

    fun applyTo(obj: JSONObject, prefs: SharedPreferences) {
        val editor = prefs.edit().clear()
        val keys = obj.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            when (val value = obj.get(key)) {
                is Boolean -> editor.putBoolean(key, value)
                is Int -> editor.putInt(key, value)
                is Long -> editor.putLong(key, value)
                is Double -> editor.putFloat(key, value.toFloat())
                is String -> editor.putString(key, value)
                is JSONArray -> {
                    val set = mutableSetOf<String>()
                    for (i in 0 until value.length()) set.add(value.getString(i))
                    editor.putStringSet(key, set)
                }
            }
        }
        editor.apply()
    }
}
