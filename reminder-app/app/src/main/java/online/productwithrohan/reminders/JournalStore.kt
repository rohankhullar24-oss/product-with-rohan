package online.productwithrohan.reminders

import android.content.Context
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import java.io.File

/**
 * Journal entries are personal thoughts, so unlike [ReminderStore]'s plain
 * JSON file, this is AES-256-GCM encrypted at rest via an Android Keystore
 * key (EncryptedFile) — on top of the biometric/lock gate on JournalActivity.
 */
object JournalStore {

    private const val FILE_NAME = "journal.enc"
    private val lock = Any()

    private fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    private fun encryptedFile(context: Context): EncryptedFile {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedFile.Builder(
            context, file(context), masterKey, EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
        ).build()
    }

    fun getAll(context: Context): List<JournalEntry> = synchronized(lock) {
        val f = file(context)
        if (!f.exists()) return emptyList()
        return try {
            val bytes = encryptedFile(context).openFileInput().use { it.readBytes() }
            val arr = JSONArray(bytes.decodeToString())
            (0 until arr.length()).map { JournalEntry.fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun get(context: Context, id: String): JournalEntry? =
        getAll(context).firstOrNull { it.id == id }

    fun upsert(context: Context, entry: JournalEntry) = synchronized(lock) {
        val list = getAll(context).filter { it.id != entry.id } + entry
        save(context, list)
    }

    fun delete(context: Context, id: String) = synchronized(lock) {
        save(context, getAll(context).filter { it.id != id })
    }

    /** Replaces the whole store, e.g. with a merged list after a cloud sync. */
    fun replaceAll(context: Context, list: List<JournalEntry>) = synchronized(lock) {
        save(context, list)
    }

    private fun save(context: Context, list: List<JournalEntry>) {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        val f = file(context)
        // EncryptedFile refuses to overwrite an existing file, so clear it first.
        if (f.exists()) f.delete()
        encryptedFile(context).openFileOutput().use { it.write(arr.toString().toByteArray()) }
    }
}
