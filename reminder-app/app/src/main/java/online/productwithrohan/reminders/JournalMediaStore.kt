package online.productwithrohan.reminders

import android.content.Context
import android.net.Uri
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKey
import java.io.File
import java.util.UUID

/**
 * Photo/video/audio attachments, one AES-256-GCM encrypted file per
 * attachment under filesDir/journal_media/ (same Keystore master key as
 * [JournalStore]). Filenames are opaque UUIDs; [JournalEntry] only ever
 * stores the filename, never a raw path.
 */
object JournalMediaStore {

    private const val DIR_NAME = "journal_media"
    private const val PLAYBACK_CACHE_DIR = "journal_playback"

    private fun mediaDir(context: Context): File =
        File(context.filesDir, DIR_NAME).apply { mkdirs() }

    private fun masterKey(context: Context): MasterKey =
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

    private fun encryptedFile(context: Context, file: File): EncryptedFile =
        EncryptedFile.Builder(
            context, file, masterKey(context), EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
        ).build()

    /** Reads [sourceUri] (e.g. from a gallery picker) and stores it encrypted. Returns the filename. */
    fun saveFromUri(context: Context, sourceUri: Uri): String {
        val bytes = context.contentResolver.openInputStream(sourceUri)?.use { it.readBytes() }
            ?: throw IllegalStateException("Could not open $sourceUri")
        return saveBytes(context, bytes)
    }

    /** Reads a plaintext temp file (e.g. a camera capture) and stores it encrypted, then deletes the temp file. */
    fun saveFromFile(context: Context, plaintextFile: File): String {
        val bytes = plaintextFile.readBytes()
        val filename = saveBytes(context, bytes)
        plaintextFile.delete()
        return filename
    }

    private fun saveBytes(context: Context, bytes: ByteArray): String {
        val filename = UUID.randomUUID().toString()
        val target = File(mediaDir(context), filename)
        encryptedFile(context, target).openFileOutput().use { it.write(bytes) }
        return filename
    }

    /** Decrypts an attachment fully into memory — fine for photos, avoid for large video/audio. */
    fun readBytes(context: Context, filename: String): ByteArray? {
        val f = File(mediaDir(context), filename)
        if (!f.exists()) return null
        return try {
            encryptedFile(context, f).openFileInput().use { it.readBytes() }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Decrypts an attachment into a plaintext cache file for handoff to
     * MediaPlayer/VideoView, which need a real file path. Reuses the cached
     * copy across repeated playback; call [clearPlaybackCache] when done
     * (e.g. the composer's onDestroy) so plaintext doesn't linger.
     */
    fun openForPlayback(context: Context, filename: String): File? {
        val bytes = readBytes(context, filename) ?: return null
        val cacheDir = File(context.cacheDir, PLAYBACK_CACHE_DIR).apply { mkdirs() }
        val out = File(cacheDir, filename)
        if (!out.exists()) out.writeBytes(bytes)
        return out
    }

    fun clearPlaybackCache(context: Context) {
        File(context.cacheDir, PLAYBACK_CACHE_DIR).deleteRecursively()
    }

    fun delete(context: Context, filename: String?) {
        if (filename == null) return
        File(mediaDir(context), filename).delete()
    }
}
