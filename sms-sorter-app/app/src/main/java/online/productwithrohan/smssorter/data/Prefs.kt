package online.productwithrohan.smssorter.data

import android.content.Context

/** Small local state: starred message ids and reminders marked done. */
class Prefs(context: Context) {
    private val prefs = context.getSharedPreferences("sms_sorter", Context.MODE_PRIVATE)

    var starred: Set<Long>
        get() = prefs.getStringSet(KEY_STARRED, emptySet())!!.mapNotNull { it.toLongOrNull() }.toSet()
        set(value) = prefs.edit().putStringSet(KEY_STARRED, value.map { it.toString() }.toSet()).apply()

    var doneReminders: Set<String>
        get() = prefs.getStringSet(KEY_DONE, emptySet())!!.toSet()
        set(value) = prefs.edit().putStringSet(KEY_DONE, value).apply()

    private companion object {
        const val KEY_STARRED = "starred_ids"
        const val KEY_DONE = "done_reminders"
    }
}
