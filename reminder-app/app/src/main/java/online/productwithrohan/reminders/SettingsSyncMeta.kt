package online.productwithrohan.reminders

import android.content.Context

/**
 * Tracks a per-settings-screen "last changed" timestamp, since SharedPreferences has
 * no update time of its own. [touch] is called from each settings object's own
 * save() (AutoReplySettings, AutoForwardSettings, ForwardCallSettings,
 * CallReplySettings, AutoSchedulerSettings); [AutoSchedulerSyncManager] reads it to
 * decide whether the local settings blob or the cloud copy is newer.
 */
object SettingsSyncMeta {
    private const val PREFS = "settings_sync_meta"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun touch(context: Context, prefsName: String) {
        prefs(context).edit().putLong(prefsName, System.currentTimeMillis()).apply()
    }

    fun updatedAt(context: Context, prefsName: String): Long = prefs(context).getLong(prefsName, 0L)

    /** Records a remote timestamp without bumping it to "now" — avoids re-pushing what was just pulled. */
    fun setSyncedUpdatedAt(context: Context, prefsName: String, updatedAt: Long) {
        prefs(context).edit().putLong(prefsName, updatedAt).apply()
    }
}
