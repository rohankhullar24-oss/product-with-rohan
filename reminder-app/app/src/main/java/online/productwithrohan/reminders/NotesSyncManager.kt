package online.productwithrohan.reminders

/**
 * Plugs Notes into [RowSyncEngine] against the shared `auto_scheduler_rows`
 * table (kind "note"), the same way [ItinerarySyncManager] does for trips and
 * stops — no dedicated table needed for the note text/checklist/metadata.
 * Image/audio attachments are separately pushed to/pulled from a private
 * Storage bucket ("notes-media"), the same pattern [JournalSyncManager] uses
 * for journal attachments.
 */
object NotesSyncManager {

    const val KIND_NOTE = "note"
    private const val MEDIA_BUCKET = "notes-media"
    private const val UPLOADED_PREFS = "note_media_uploaded"

    @Volatile
    private var syncing = false

    /** Fire-and-forget background sync; onDone runs on the worker thread. */
    fun syncAsync(context: android.content.Context, onDone: ((changed: Boolean) -> Unit)? = null) {
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
    fun syncBlocking(context: android.content.Context): Boolean {
        if (syncing) return false
        syncing = true
        try {
            if (SupabaseClient.userId(context) == null) return false
            val changed = RowSyncEngine.sync(
                context, KIND_NOTE, NoteStore.getAll(context),
                idOf = { it.id }, updatedAtOf = { it.updatedAt },
                toPayload = { it.toJson() }, fromPayload = { Note.fromJson(it) },
                replaceAllLocal = { NoteStore.replaceAll(context, it) },
            )
            try {
                syncMedia(context, NoteStore.getAll(context))
            } catch (e: Exception) {
                // A media hiccup shouldn't fail the whole sync -- text/checklist already landed above.
            }
            return changed
        } finally {
            syncing = false
        }
    }

    /**
     * Uploads any attachment that only exists on this device (tracked in
     * [UPLOADED_PREFS] so an image/recording isn't re-uploaded every sync
     * tick), and downloads any attachment referenced by a merged note this
     * device doesn't have yet -- e.g. one pulled in from a second device.
     * Each file is handled independently so one failure doesn't block the rest.
     */
    private fun syncMedia(context: android.content.Context, notes: List<Note>) {
        val uploaded = context.getSharedPreferences(UPLOADED_PREFS, android.content.Context.MODE_PRIVATE)
        for (note in notes) {
            for (filename in note.images + note.audio) {
                try {
                    if (NoteMediaStore.existsLocally(context, filename)) {
                        if (!uploaded.contains(filename)) {
                            val bytes = NoteMediaStore.readBytes(context, filename) ?: continue
                            SupabaseClient.uploadStorageObject(context, MEDIA_BUCKET, filename, bytes, "application/octet-stream")
                            uploaded.edit().putBoolean(filename, true).apply()
                        }
                    } else {
                        val bytes = SupabaseClient.downloadStorageObject(context, MEDIA_BUCKET, filename) ?: continue
                        NoteMediaStore.saveBytesAsFilename(context, filename, bytes)
                        uploaded.edit().putBoolean(filename, true).apply()
                    }
                } catch (e: Exception) {
                    // Offline or a transient failure -- retried on the next sync.
                }
            }
        }
    }

    /** Deletes a note's attachments from the cloud bucket; call after a local delete. Blocking — run off the main thread. */
    fun deleteMediaBlocking(context: android.content.Context, filenames: List<String>) {
        filenames.forEach { runCatching { SupabaseClient.deleteStorageObject(context, MEDIA_BUCKET, it) } }
    }
}
