package online.productwithrohan.reminders

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * One JSON file covering every locally-stored Auto Scheduler data set
 * (tasks, recipient lists, templates, auto-reply rules, and every settings
 * screen), on top of what [MainActivity]'s reminders-only export/import
 * already covers. Settings are dumped generically via
 * [SharedPreferences.getAll] instead of field-by-field, so this doesn't need
 * updating every time a settings screen gains a new toggle.
 */
object BackupManager {

    private const val FORMAT_VERSION = 1

    /** file name (under filesDir) -> key in the backup JSON's "stores" object. */
    private val JSON_STORES = mapOf(
        "reminders.json" to "reminders",
        "auto_tasks.json" to "autoTasks",
        "recipient_lists.json" to "recipientLists",
        "templates.json" to "templates",
        "auto_reply_rules.json" to "autoReplyRules",
    )

    private val PREF_FILES = listOf(
        "auto_reply_settings",
        "auto_forward_settings",
        "forward_call_settings",
        "call_reply_settings",
        "auto_scheduler_settings",
    )

    fun exportAll(context: Context): String {
        val root = JSONObject()
        root.put("formatVersion", FORMAT_VERSION)
        root.put("exportedAt", System.currentTimeMillis())

        val stores = JSONObject()
        for ((fileName, key) in JSON_STORES) {
            stores.put(key, readJsonArray(context, fileName))
        }
        root.put("stores", stores)

        val prefs = JSONObject()
        for (name in PREF_FILES) {
            prefs.put(name, prefsToJson(context.getSharedPreferences(name, Context.MODE_PRIVATE)))
        }
        root.put("prefs", prefs)

        return root.toString(2)
    }

    /** Overwrites every store/settings file covered above with the backup's contents. */
    fun importAll(context: Context, text: String) {
        val root = JSONObject(text)

        val stores = root.optJSONObject("stores") ?: JSONObject()
        for ((fileName, key) in JSON_STORES) {
            val arr = stores.optJSONArray(key) ?: continue
            File(context.filesDir, fileName).writeText(arr.toString())
        }

        val prefs = root.optJSONObject("prefs") ?: JSONObject()
        for (name in PREF_FILES) {
            val obj = prefs.optJSONObject(name) ?: continue
            jsonToPrefs(obj, context.getSharedPreferences(name, Context.MODE_PRIVATE))
        }
    }

    private fun readJsonArray(context: Context, fileName: String): JSONArray {
        val f = File(context.filesDir, fileName)
        if (!f.exists()) return JSONArray()
        return try {
            JSONArray(f.readText())
        } catch (e: Exception) {
            JSONArray()
        }
    }

    private fun prefsToJson(prefs: SharedPreferences): JSONObject {
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

    private fun jsonToPrefs(obj: JSONObject, prefs: SharedPreferences) {
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
