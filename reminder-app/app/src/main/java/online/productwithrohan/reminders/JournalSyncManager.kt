package online.productwithrohan.reminders

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Same offline-first, last-write-wins sync as [SyncManager], applied to
 * journal entries against the separate `journal_entries` table: local storage
 * always works fully offline, and signing in additionally merges with the
 * cloud copy (by updatedAt), with tombstones propagating deletions.
 */
object JournalSyncManager {

    private const val TOMBSTONE_PREFS = "journal_sync_tombstones"
    private const val TOMBSTONE_MAX_AGE_MS = 90L * 24 * 60 * 60 * 1000

    @Volatile
    private var syncing = false

    /** Records a local deletion so the next sync propagates it. */
    fun recordDeletion(context: Context, entryId: String) {
        val p = context.getSharedPreferences(TOMBSTONE_PREFS, Context.MODE_PRIVATE)
        p.edit().putLong(entryId, System.currentTimeMillis()).apply()
    }

    private fun tombstones(context: Context): Map<String, Long> {
        val p = context.getSharedPreferences(TOMBSTONE_PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val result = mutableMapOf<String, Long>()
        val editor = p.edit()
        for ((key, value) in p.all) {
            val millis = value as? Long ?: continue
            if (now - millis > TOMBSTONE_MAX_AGE_MS) editor.remove(key) else result[key] = millis
        }
        editor.apply()
        return result
    }

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
                // Offline or server hiccup — local data is untouched, retry later.
            }
            onDone?.invoke(changed)
        }.start()
    }

    /** Returns true when the local list changed. Throws on network failure. */
    @Synchronized
    fun syncBlocking(context: Context): Boolean {
        if (syncing) return false
        syncing = true
        try {
            val userId = SupabaseClient.userId(context) ?: return false
            val localBefore = JournalStore.getAll(context)
            val localById = localBefore.associateBy { it.id }
            val tombs = tombstones(context)

            data class RemoteRow(val payload: JSONObject?, val updatedAt: Long, val deleted: Boolean)

            val remoteById = mutableMapOf<String, RemoteRow>()
            val rows = SupabaseClient.fetchJournalRows(context)
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                remoteById[row.getString("id")] = RemoteRow(
                    payload = row.optJSONObject("payload"),
                    updatedAt = row.optLong("updated_at", 0L),
                    deleted = row.optBoolean("deleted", false),
                )
            }

            val merged = mutableListOf<JournalEntry>()
            val toPush = JSONArray()
            val allIds = localById.keys + remoteById.keys + tombs.keys

            for (id in allIds) {
                val local = localById[id]
                val remote = remoteById[id]
                val tombAt = tombs[id]

                val localAt = local?.updatedAt ?: -1L
                val remoteAt = remote?.updatedAt ?: -1L
                val deleteAt = maxOf(tombAt ?: -1L, if (remote?.deleted == true) remoteAt else -1L)

                if (deleteAt >= localAt && deleteAt >= remoteAt) {
                    // Deletion wins: drop it everywhere.
                    if (tombAt != null && deleteAt > remoteAt) {
                        toPush.put(tombstoneRow(id, userId, deleteAt))
                    }
                    continue
                }
                if (remoteAt > localAt && remote?.payload != null && !remote.deleted) {
                    merged.add(JournalEntry.fromJson(remote.payload))
                } else if (local != null) {
                    merged.add(local)
                    if (localAt > remoteAt) toPush.put(entryRow(local, userId))
                }
            }

            SupabaseClient.upsertJournalRows(context, toPush)

            val changed = didListChange(localBefore, merged)
            if (changed) {
                JournalStore.replaceAll(context, merged)
            }
            return changed
        } finally {
            syncing = false
        }
    }

    private fun didListChange(before: List<JournalEntry>, after: List<JournalEntry>): Boolean {
        if (before.size != after.size) return true
        val beforeById = before.associateBy { it.id }
        return after.any { beforeById[it.id] != it }
    }

    private fun entryRow(entry: JournalEntry, userId: String): JSONObject = JSONObject()
        .put("id", entry.id)
        .put("user_id", userId)
        .put("payload", entry.toJson())
        .put("updated_at", entry.updatedAt)
        .put("deleted", false)

    private fun tombstoneRow(id: String, userId: String, millis: Long): JSONObject = JSONObject()
        .put("id", id)
        .put("user_id", userId)
        .put("payload", JSONObject())
        .put("updated_at", millis)
        .put("deleted", true)
}
