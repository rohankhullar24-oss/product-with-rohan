package online.productwithrohan.reminders

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.documentfile.provider.DocumentFile
import net.lingala.zip4j.ZipFile
import net.lingala.zip4j.exception.ZipException
import java.io.File
import java.util.concurrent.Executors

/**
 * Extracts a zip (picked via SAF) into a user-picked destination folder, also
 * via SAF so no storage permission is needed. zip4j only works against real
 * files, so the picked zip is copied into the cache dir first and extracted
 * there before its contents are copied into the destination tree.
 */
class ZipExtractorActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var zipNameText: TextView
    private lateinit var destinationText: TextView
    private lateinit var extractButton: Button
    private lateinit var progress: ProgressBar
    private lateinit var statusText: TextView

    private var zipUri: Uri? = null
    private var destinationUri: Uri? = null

    private val chooseZipLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri == null) return@registerForActivityResult
            zipUri = uri
            zipNameText.text = displayNameFor(uri) ?: uri.toString()
            updateExtractEnabled()
        }

    private val chooseDestinationLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
            if (uri == null) return@registerForActivityResult
            contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
            destinationUri = uri
            destinationText.text = DocumentFile.fromTreeUri(this, uri)?.name ?: uri.toString()
            updateExtractEnabled()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_zip_extractor)
        title = getString(R.string.title_zip_extractor)

        zipNameText = findViewById(R.id.zip_name)
        destinationText = findViewById(R.id.destination_name)
        extractButton = findViewById(R.id.button_extract)
        progress = findViewById(R.id.progress)
        statusText = findViewById(R.id.status_text)

        findViewById<Button>(R.id.button_choose_zip).setOnClickListener {
            chooseZipLauncher.launch(arrayOf("*/*"))
        }
        findViewById<Button>(R.id.button_choose_destination).setOnClickListener {
            chooseDestinationLauncher.launch(null)
        }
        extractButton.setOnClickListener { startExtraction(password = null) }
    }

    private fun updateExtractEnabled() {
        extractButton.isEnabled = zipUri != null && destinationUri != null
    }

    private fun displayNameFor(uri: Uri): String? {
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) return cursor.getString(0)
        }
        return null
    }

    private fun startExtraction(password: String?) {
        val zip = zipUri ?: return
        val destination = destinationUri ?: return

        setBusy(true)
        statusText.text = getString(R.string.zip_extracting)

        executor.execute {
            val tempDir = File(cacheDir, "zip_extract_${System.currentTimeMillis()}")
            val tempZip = File(cacheDir, "zip_extract_source_${System.currentTimeMillis()}.zip")
            try {
                contentResolver.openInputStream(zip)?.use { input ->
                    tempZip.outputStream().use { output -> input.copyTo(output) }
                } ?: throw IllegalStateException("could not open the selected zip file")

                tempDir.mkdirs()
                val zipFile = ZipFile(tempZip)
                if (zipFile.isEncrypted) {
                    if (password.isNullOrEmpty()) {
                        mainHandler.post {
                            setBusy(false)
                            statusText.text = getString(R.string.zip_password_needed)
                            promptPassword()
                        }
                        return@execute
                    }
                    zipFile.setPassword(password.toCharArray())
                }
                zipFile.extractAll(tempDir.absolutePath)

                val destinationDoc = DocumentFile.fromTreeUri(this, destination)
                    ?: throw IllegalStateException("the destination folder is no longer available")
                val copied = copyTreeToDocument(tempDir, destinationDoc)

                mainHandler.post {
                    setBusy(false)
                    val message = getString(R.string.zip_extract_done, copied)
                    statusText.text = message
                    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                }
            } catch (e: ZipException) {
                val wrongPassword = e.type == ZipException.Type.WRONG_PASSWORD
                mainHandler.post {
                    setBusy(false)
                    if (wrongPassword) {
                        statusText.text = getString(R.string.zip_wrong_password)
                        promptPassword()
                    } else {
                        statusText.text = getString(R.string.zip_extract_failed, e.message ?: e.toString())
                    }
                }
            } catch (e: Exception) {
                mainHandler.post {
                    setBusy(false)
                    statusText.text = getString(R.string.zip_extract_failed, e.message ?: e.toString())
                }
            } finally {
                tempZip.delete()
                tempDir.deleteRecursively()
            }
        }
    }

    /** Walks the extracted files on disk and copies each into the SAF destination tree, mirroring folders. */
    private fun copyTreeToDocument(root: File, destinationRoot: DocumentFile): Int {
        var count = 0
        val dirCache = HashMap<String, DocumentFile>()

        fun dirFor(path: String): DocumentFile {
            if (path.isEmpty()) return destinationRoot
            dirCache[path]?.let { return it }
            val slash = path.lastIndexOf('/')
            val parentPath = if (slash >= 0) path.substring(0, slash) else ""
            val name = if (slash >= 0) path.substring(slash + 1) else path
            val parentDoc = dirFor(parentPath)
            val existing = parentDoc.findFile(name)
            val doc = if (existing != null && existing.isDirectory) existing
                else parentDoc.createDirectory(name)
                    ?: throw IllegalStateException("could not create folder $name")
            dirCache[path] = doc
            return doc
        }

        root.walkTopDown().filter { it.isFile }.forEach { file ->
            val relative = file.relativeTo(root).path
            val slash = relative.lastIndexOf('/')
            val relativeDir = if (slash >= 0) relative.substring(0, slash) else ""
            val destDir = dirFor(relativeDir)
            val outDoc = destDir.createFile("application/octet-stream", file.name)
                ?: throw IllegalStateException("could not create file ${file.name}")
            contentResolver.openOutputStream(outDoc.uri)?.use { out ->
                file.inputStream().use { input -> input.copyTo(out) }
            } ?: throw IllegalStateException("could not write ${file.name}")
            count++
            mainHandler.post { statusText.text = getString(R.string.zip_extracting_file, relative) }
        }
        return count
    }

    private fun promptPassword() {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = getString(R.string.zip_password_hint)
        }
        val padding = (20 * resources.displayMetrics.density).toInt()
        val container = FrameLayout(this).apply {
            setPadding(padding, padding / 2, padding, 0)
            addView(input)
        }

        AlertDialog.Builder(this)
            .setTitle(R.string.zip_password_title)
            .setView(container)
            .setPositiveButton(R.string.zip_extract) { _, _ ->
                startExtraction(password = input.text.toString())
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun setBusy(busy: Boolean) {
        progress.visibility = if (busy) View.VISIBLE else View.GONE
        extractButton.isEnabled = !busy && zipUri != null && destinationUri != null
    }
}
