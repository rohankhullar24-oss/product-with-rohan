package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Mirrors [SyncManager]'s offline-first cloud sync (used for reminders) onto every
 * Auto Scheduler data set -- tasks, recipient lists, templates, auto-reply rules, and
 * every settings screen -- so signing in with the same email/OTP on a new install
 * restores all of it automatically, the same way reminders already do. Unlike
 * [BackupManager] (an explicit, one-shot export/import file) or the Android
 * auto-backup XML rules (only work if the device has Google cloud backup on), this
 * runs whenever the user is signed in, with no extra step.
 */
object AutoSchedulerSyncManager {

    private val SETTINGS_PREFS = listOf(
        "auto_reply_settings",
        "auto_forward_settings",
        "forward_call_settings",
        "call_reply_settings",
        "auto_scheduler_settings",
    )

    @Volatile
    private var syncing = false

    /** Fire-and-forget background sync; onDone runs on the worker thread. */
    fun syncAsync(context: Context, onDone: ((changed: Boolean) -> Unit)? = null) {
        val app = context.applicationContext
        if (!SupabaseClient.isSignedIn(app)) {
            onDone?.invoke(false)
            return
        }
        Thread {
            var changed = false
            try {
                changed = syncBlocking(app)
            } catch (e: Exception) {
                // Offline or server hiccup -- local data is untouched, retry later.
            }
            onDone?.invoke(changed)
        }.start()
    }

    @Synchronized
    fun syncBlocking(context: Context): Boolean {
        if (syncing) return false
        syncing = true
        try {
            if (SupabaseClient.userId(context) == null) return false
            var changed = false
            changed = syncAutoTasks(context) || changed
            changed = syncRecipientLists(context) || changed
            changed = syncTemplates(context) || changed
            changed = syncAutoReplyRules(context) || changed
            changed = syncSettings(context) || changed
            return changed
        } finally {
            syncing = false
        }
    }

    private fun syncAutoTasks(context: Context): Boolean = RowSyncEngine.sync(
        context, "auto_task", AutoTaskStore.getAll(context),
        idOf = { it.id }, updatedAtOf = { it.updatedAt },
        toPayload = { it.toJson() }, fromPayload = { AutoTask.fromJson(it) },
        replaceAllLocal = { AutoTaskStore.replaceAll(context, it) },
    )

    private fun syncRecipientLists(context: Context): Boolean = RowSyncEngine.sync(
        context, "recipient_list", RecipientListStore.getAll(context),
        idOf = { it.id }, updatedAtOf = { it.updatedAt },
        toPayload = { it.toJson() }, fromPayload = { RecipientList.fromJson(it) },
        replaceAllLocal = { RecipientListStore.replaceAll(context, it) },
    )

    private fun syncTemplates(context: Context): Boolean = RowSyncEngine.sync(
        context, "template", TemplateStore.getAll(context),
        idOf = { it.id }, updatedAtOf = { it.updatedAt },
        toPayload = { it.toJson() }, fromPayload = { Template.fromJson(it) },
        replaceAllLocal = { TemplateStore.replaceAll(context, it) },
    )

    private fun syncAutoReplyRules(context: Context): Boolean = RowSyncEngine.sync(
        context, "auto_reply_rule", AutoReplyRuleStore.getAll(context),
        idOf = { it.id }, updatedAtOf = { it.updatedAt },
        toPayload = { it.toJson() }, fromPayload = { AutoReplyRule.fromJson(it) },
        replaceAllLocal = { AutoReplyRuleStore.replaceAll(context, it) },
    )

    /**
     * Settings are five whole-blob rows (kind "settings", id = the SharedPreferences
     * file name), not per-field -- merged coarsely like [BackupManager] does, since
     * conflicting edits to the same toggle from two devices at once is not a realistic
     * case worth field-level merging for.
     */
    private fun syncSettings(context: Context): Boolean {
        val userId = SupabaseClient.userId(context) ?: return false
        val remoteByName = mutableMapOf<String, JSONObject>()
        val rows = SupabaseClient.fetchAutoSchedulerRows(context, "settings")
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            remoteByName[row.getString("id")] = row
        }

        var changed = false
        val toPush = JSONArray()
        for (prefsName in SETTINGS_PREFS) {
            val localUpdatedAt = SettingsSyncMeta.updatedAt(context, prefsName)
            val remote = remoteByName[prefsName]
            val remoteUpdatedAt = remote?.optLong("updated_at", 0L) ?: -1L
            val remoteDeleted = remote?.optBoolean("deleted", false) ?: false

            if (remote != null && !remoteDeleted && remoteUpdatedAt > localUpdatedAt) {
                val payload = remote.optJSONObject("payload") ?: JSONObject()
                PrefsJson.applyTo(payload, context.getSharedPreferences(prefsName, Context.MODE_PRIVATE))
                SettingsSyncMeta.setSyncedUpdatedAt(context, prefsName, remoteUpdatedAt)
                changed = true
            } else if (localUpdatedAt > remoteUpdatedAt) {
                val payload = PrefsJson.toJson(context.getSharedPreferences(prefsName, Context.MODE_PRIVATE))
                toPush.put(
                    JSONObject()
                        .put("id", prefsName)
                        .put("kind", "settings")
                        .put("user_id", userId)
                        .put("payload", payload)
                        .put("updated_at", localUpdatedAt)
                        .put("deleted", false)
                )
            }
        }
        SupabaseClient.upsertAutoSchedulerRows(context, toPush)
        return changed
    }
}
