package online.productwithrohan.reminders

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import com.googlecode.tesseract.android.TessBaseAPI
import java.io.File
import java.util.concurrent.Executors

/**
 * On-device OCR via Tesseract4Android (open source, no Google dependency).
 * The English trained-data file is bundled as an asset and copied to a
 * plain filesystem path on first use, since Tesseract can't read straight
 * out of the APK's assets.
 */
class OcrScanActivity : AppCompatActivity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var preview: ImageView
    private lateinit var resultText: EditText
    private lateinit var progress: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var saveButton: Button

    private var pendingCameraFile: File? = null

    private val takePictureLauncher = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val file = pendingCameraFile
        pendingCameraFile = null
        if (success && file != null) {
            BitmapFactory.decodeFile(file.absolutePath)?.let { recognize(it) }
        }
    }

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            val bitmap = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
            if (bitmap != null) recognize(bitmap)
        }
    }

    private val saveTextLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        if (uri != null) saveText(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ocr_scan)
        title = getString(R.string.works_enabler_ocr_title)

        preview = findViewById(R.id.ocr_preview)
        resultText = findViewById(R.id.ocr_result)
        progress = findViewById(R.id.progress)
        statusText = findViewById(R.id.status_text)
        saveButton = findViewById(R.id.button_save_text)

        findViewById<Button>(R.id.button_take_photo).setOnClickListener { launchCamera() }
        findViewById<Button>(R.id.button_pick_image).setOnClickListener { pickImageLauncher.launch("image/*") }
        saveButton.setOnClickListener { saveTextLauncher.launch("scan.txt") }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
    }

    private fun launchCamera() {
        val dir = File(cacheDir, "works_enabler_camera").apply { mkdirs() }
        val file = File(dir, "scan_${System.currentTimeMillis()}.jpg")
        pendingCameraFile = file
        val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        takePictureLauncher.launch(uri)
    }

    private fun recognize(bitmap: Bitmap) {
        preview.setImageBitmap(bitmap)
        preview.visibility = View.VISIBLE
        saveButton.isEnabled = false
        setBusy(true, R.string.ocr_recognizing)

        executor.execute {
            val dataPath = File(filesDir, "tesseract").absolutePath
            if (!ensureTrainedData(dataPath)) {
                mainHandler.post {
                    setBusy(false, null)
                    statusText.text = getString(R.string.ocr_language_missing)
                }
                return@execute
            }

            val tess = TessBaseAPI()
            try {
                if (!tess.init(dataPath, "eng")) {
                    mainHandler.post {
                        setBusy(false, null)
                        statusText.text = getString(R.string.ocr_language_missing)
                    }
                    return@execute
                }
                tess.setImage(bitmap)
                val text = tess.getUTF8Text().orEmpty()
                mainHandler.post {
                    setBusy(false, null)
                    resultText.setText(text)
                    saveButton.isEnabled = text.isNotBlank()
                    statusText.text = if (text.isBlank()) getString(R.string.ocr_no_text_found) else ""
                }
            } finally {
                tess.recycle()
            }
        }
    }

    /**
     * Copies the bundled `eng.traineddata` from assets into [dataPath]/tessdata/
     * once. Returns false if it's missing from assets — see
     * assets/tessdata/README.md, this file is deliberately not vendored here.
     */
    private fun ensureTrainedData(dataPath: String): Boolean {
        val destDir = File(dataPath, "tessdata").apply { mkdirs() }
        val dest = File(destDir, "eng.traineddata")
        if (dest.exists() && dest.length() > 0) return true
        return try {
            assets.open("tessdata/eng.traineddata").use { input ->
                dest.outputStream().use { output -> input.copyTo(output) }
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun saveText(uri: Uri) {
        try {
            contentResolver.openOutputStream(uri)?.use { out ->
                out.write(resultText.text.toString().toByteArray())
            } ?: throw IllegalStateException("could not open the destination")
            Toast.makeText(this, R.string.ocr_saved, Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, R.string.ocr_save_failed, Toast.LENGTH_SHORT).show()
        }
    }

    private fun setBusy(busy: Boolean, statusRes: Int?) {
        progress.visibility = if (busy) View.VISIBLE else View.GONE
        statusRes?.let { statusText.text = getString(it) }
    }
}
