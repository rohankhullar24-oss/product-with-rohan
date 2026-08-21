package online.productwithrohan.reminders

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.MediaController
import android.widget.TextView
import android.widget.Toast
import android.widget.VideoView
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.google.android.material.R as MaterialR
import java.io.File

/**
 * Add or edit one journal entry: free-form text plus an optional photo,
 * video, voice recording and location. Attachments are captured/picked
 * immediately into [JournalMediaStore] so previews work right away; the
 * original entry's attachment files are only actually deleted once Save
 * commits the new state (see [replacePhoto]/[replaceVideo]/[replaceAudio]),
 * so backing out of an edit never loses the entry's existing attachments.
 */
class JournalEditActivity : AppCompatActivity() {

    private lateinit var textInput: EditText
    private lateinit var rowPhoto: View
    private lateinit var photoPreview: ImageView
    private lateinit var rowVideo: View
    private lateinit var videoPreview: VideoView
    private lateinit var rowAudio: View
    private lateinit var playAudioButton: Button
    private lateinit var rowLocation: View
    private lateinit var locationText: TextView
    private lateinit var recordAudioButton: ImageButton

    private var entry: JournalEntry? = null

    private var photoFile: String? = null
    private var videoFile: String? = null
    private var audioFile: String? = null
    private var latitude: Double? = null
    private var longitude: Double? = null
    private var placeName: String? = null

    private var originalPhotoFile: String? = null
    private var originalVideoFile: String? = null
    private var originalAudioFile: String? = null

    private var pendingCameraFile: File? = null
    private var isRecording = false
    private var recorder: MediaRecorder? = null
    private var recordingFile: File? = null
    private var player: MediaPlayer? = null

    private val takePictureLauncher = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val file = pendingCameraFile
        pendingCameraFile = null
        if (success && file != null) {
            replacePhoto(JournalMediaStore.saveFromFile(this, file))
        }
    }

    private val captureVideoLauncher = registerForActivityResult(ActivityResultContracts.CaptureVideo()) { success ->
        val file = pendingCameraFile
        pendingCameraFile = null
        if (success && file != null) {
            replaceVideo(JournalMediaStore.saveFromFile(this, file))
        }
    }

    /** One gallery picker for either a photo or a video; routed by the picked item's mime type. */
    private val pickMediaLauncher = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
        if (uri == null) return@registerForActivityResult
        val mimeType = contentResolver.getType(uri) ?: ""
        if (mimeType.startsWith("video")) {
            replaceVideo(JournalMediaStore.saveFromUri(this, uri))
        } else {
            replacePhoto(JournalMediaStore.saveFromUri(this, uri))
        }
    }

    private val recordAudioPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startRecording() else Toast.makeText(this, R.string.journal_audio_permission_denied, Toast.LENGTH_SHORT).show()
        }

    private val locationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) captureLocation() else Toast.makeText(this, R.string.journal_location_permission_denied, Toast.LENGTH_SHORT).show()
        }

    private val suggestionsLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val data = result.data ?: return@registerForActivityResult
            val photoUri = data.getStringExtra(JournalSuggestionsActivity.EXTRA_PHOTO_URI)?.let { Uri.parse(it) }
            if (photoUri != null) {
                replacePhoto(JournalMediaStore.saveFromUri(this, photoUri))
                return@registerForActivityResult
            }
            if (data.getBooleanExtra(JournalSuggestionsActivity.EXTRA_USE_LOCATION, false)) {
                latitude = data.getDoubleExtra(JournalSuggestionsActivity.EXTRA_LATITUDE, 0.0)
                longitude = data.getDoubleExtra(JournalSuggestionsActivity.EXTRA_LONGITUDE, 0.0)
                placeName = data.getStringExtra(JournalSuggestionsActivity.EXTRA_PLACE_NAME)
                renderLocation()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_journal_edit)

        val existingId = intent.getStringExtra(EXTRA_ENTRY_ID)
        entry = existingId?.let { JournalStore.get(this, it) }
        title = getString(if (entry == null) R.string.title_new_journal else R.string.title_edit_journal)

        textInput = findViewById(R.id.input_text)
        rowPhoto = findViewById(R.id.row_photo)
        photoPreview = findViewById(R.id.photo_preview)
        rowVideo = findViewById(R.id.row_video)
        videoPreview = findViewById(R.id.video_preview)
        rowAudio = findViewById(R.id.row_audio)
        playAudioButton = findViewById(R.id.button_play_audio)
        rowLocation = findViewById(R.id.row_location)
        locationText = findViewById(R.id.text_location)
        recordAudioButton = findViewById(R.id.button_record_audio)

        entry?.let {
            textInput.setText(it.text)
            photoFile = it.photoFile
            videoFile = it.videoFile
            audioFile = it.audioFile
            latitude = it.latitude
            longitude = it.longitude
            placeName = it.placeName
        }
        originalPhotoFile = photoFile
        originalVideoFile = videoFile
        originalAudioFile = audioFile

        findViewById<ImageButton>(R.id.button_gallery).setOnClickListener {
            pickMediaLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))
        }
        findViewById<ImageButton>(R.id.button_camera).setOnClickListener { chooseCameraMode() }
        findViewById<ImageButton>(R.id.button_add_location).setOnClickListener { onLocationTapped() }
        findViewById<ImageButton>(R.id.button_suggestions).setOnClickListener {
            suggestionsLauncher.launch(Intent(this, JournalSuggestionsActivity::class.java))
        }
        recordAudioButton.setOnClickListener { onRecordTapped() }
        playAudioButton.setOnClickListener { onPlayAudioTapped() }

        findViewById<ImageButton>(R.id.button_remove_photo).setOnClickListener { replacePhoto(null) }
        findViewById<ImageButton>(R.id.button_remove_video).setOnClickListener { replaceVideo(null) }
        findViewById<ImageButton>(R.id.button_remove_audio).setOnClickListener { replaceAudio(null) }
        findViewById<ImageButton>(R.id.button_remove_location).setOnClickListener {
            latitude = null
            longitude = null
            placeName = null
            renderLocation()
        }

        renderPhoto()
        renderVideo()
        renderAudio()
        renderLocation()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.journal_edit_menu, menu)
        menu.findItem(R.id.action_delete_entry).isVisible = entry != null
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_save_entry -> {
            save()
            true
        }
        R.id.action_delete_entry -> {
            confirmDelete()
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAudioPlayback()
        videoPreview.stopPlayback()
        if (isRecording) stopRecording()
        JournalMediaStore.clearPlaybackCache(this)
    }

    // --- Camera (photo or video capture; gallery picking is a separate button) ---

    private fun chooseCameraMode() {
        AlertDialog.Builder(this)
            .setItems(arrayOf(getString(R.string.journal_take_photo), getString(R.string.journal_take_video))) { _, which ->
                if (which == 0) launchCameraPhoto() else launchCameraVideo()
            }
            .show()
    }

    // --- Photo ---

    private fun launchCameraPhoto() {
        val file = newCameraFile("photo", "jpg")
        pendingCameraFile = file
        takePictureLauncher.launch(fileProviderUri(file))
    }

    private fun replacePhoto(filename: String?) {
        val prev = photoFile
        if (prev != null && prev != originalPhotoFile) JournalMediaStore.delete(this, prev)
        photoFile = filename
        renderPhoto()
    }

    private fun renderPhoto() {
        rowPhoto.visibility = if (photoFile != null) View.VISIBLE else View.GONE
        ThumbnailLoader.load(photoPreview, photoFile)
    }

    // --- Video ---

    private fun launchCameraVideo() {
        val file = newCameraFile("video", "mp4")
        pendingCameraFile = file
        captureVideoLauncher.launch(fileProviderUri(file))
    }

    private fun replaceVideo(filename: String?) {
        val prev = videoFile
        if (prev != null && prev != originalVideoFile) JournalMediaStore.delete(this, prev)
        videoFile = filename
        renderVideo()
    }

    private fun renderVideo() {
        val filename = videoFile
        if (filename == null) {
            videoPreview.stopPlayback()
            rowVideo.visibility = View.GONE
            return
        }
        rowVideo.visibility = View.VISIBLE
        Thread {
            val file = JournalMediaStore.openForPlayback(this, filename)
            runOnUiThread {
                if (videoFile == filename && file != null) {
                    videoPreview.setVideoPath(file.absolutePath)
                    videoPreview.setMediaController(MediaController(this).apply { setAnchorView(videoPreview) })
                }
            }
        }.start()
    }

    // --- Audio ---

    private fun onRecordTapped() {
        if (isRecording) {
            stopRecording()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            startRecording()
        } else {
            recordAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun startRecording() {
        stopAudioPlayback()
        val file = File(cacheDir, "journal_record_${System.currentTimeMillis()}.m4a")
        recordingFile = file
        try {
            recorder = newMediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            isRecording = true
            recordAudioButton.setColorFilter(themeColor(MaterialR.attr.colorError))
            recordAudioButton.contentDescription = getString(R.string.journal_stop_recording)
        } catch (e: Exception) {
            recorder = null
            recordingFile = null
            Toast.makeText(this, R.string.journal_recording_failed, Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopRecording() {
        try {
            recorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            // A very short recording can throw on stop(); treated as a failed take below.
        }
        recorder = null
        isRecording = false
        recordAudioButton.clearColorFilter()
        recordAudioButton.contentDescription = getString(R.string.journal_action_record_audio)

        val file = recordingFile
        recordingFile = null
        if (file != null && file.exists() && file.length() > 0) {
            replaceAudio(JournalMediaStore.saveFromFile(this, file))
        } else {
            file?.delete()
        }
    }

    @Suppress("DEPRECATION")
    private fun newMediaRecorder(): MediaRecorder =
        if (Build.VERSION.SDK_INT >= 31) MediaRecorder(this) else MediaRecorder()

    private fun themeColor(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun replaceAudio(filename: String?) {
        stopAudioPlayback()
        val prev = audioFile
        if (prev != null && prev != originalAudioFile) JournalMediaStore.delete(this, prev)
        audioFile = filename
        renderAudio()
    }

    private fun renderAudio() {
        rowAudio.visibility = if (audioFile != null) View.VISIBLE else View.GONE
    }

    private fun onPlayAudioTapped() {
        if (player != null) {
            stopAudioPlayback()
            return
        }
        val filename = audioFile ?: return
        playAudioButton.isEnabled = false
        Thread {
            val file = JournalMediaStore.openForPlayback(this, filename)
            runOnUiThread {
                playAudioButton.isEnabled = true
                if (file != null && audioFile == filename) startAudioPlayback(file)
            }
        }.start()
    }

    private fun startAudioPlayback(file: File) {
        player = MediaPlayer().apply {
            setDataSource(file.absolutePath)
            setOnCompletionListener { stopAudioPlayback() }
            prepare()
            start()
        }
        playAudioButton.text = getString(R.string.journal_stop_audio)
    }

    private fun stopAudioPlayback() {
        player?.apply {
            try {
                stop()
            } catch (e: Exception) {
                // Already stopped/released.
            }
            release()
        }
        player = null
        if (::playAudioButton.isInitialized) playAudioButton.text = getString(R.string.journal_play_audio)
    }

    // --- Location ---

    private fun onLocationTapped() {
        if (JournalLocation.hasPermission(this)) {
            captureLocation()
        } else {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    private fun captureLocation() {
        locationText.text = getString(R.string.journal_locating)
        rowLocation.visibility = View.VISIBLE
        JournalLocation.requestCurrent(
            this,
            onResult = { lat, lng, place ->
                latitude = lat
                longitude = lng
                placeName = place
                runOnUiThread { renderLocation() }
            },
            onFailure = {
                runOnUiThread {
                    Toast.makeText(this, R.string.journal_location_failed, Toast.LENGTH_SHORT).show()
                    renderLocation()
                }
            },
        )
    }

    private fun renderLocation() {
        val lat = latitude
        val lng = longitude
        if (lat == null || lng == null) {
            rowLocation.visibility = View.GONE
            return
        }
        rowLocation.visibility = View.VISIBLE
        locationText.text = placeName ?: getString(R.string.journal_location_coordinates, lat, lng)
    }

    // --- Camera file helpers ---

    private fun newCameraFile(prefix: String, extension: String): File {
        val dir = File(cacheDir, "journal_camera").apply { mkdirs() }
        return File(dir, "${prefix}_${System.currentTimeMillis()}.$extension")
    }

    private fun fileProviderUri(file: File): Uri =
        FileProvider.getUriForFile(this, "$packageName.fileprovider", file)

    // --- Save / delete ---

    private fun save() {
        val text = textInput.text.toString().trim()
        if (isRecording) stopRecording()
        if (text.isEmpty() && photoFile == null && videoFile == null && audioFile == null && latitude == null) {
            finish()
            return
        }
        val now = System.currentTimeMillis()
        val toSave = (entry ?: JournalEntry(createdAt = now)).apply {
            this.text = text
            this.photoFile = this@JournalEditActivity.photoFile
            this.videoFile = this@JournalEditActivity.videoFile
            this.audioFile = this@JournalEditActivity.audioFile
            this.latitude = this@JournalEditActivity.latitude
            this.longitude = this@JournalEditActivity.longitude
            this.placeName = this@JournalEditActivity.placeName
            this.updatedAt = now
        }
        JournalStore.upsert(this, toSave)

        // Only now drop whichever original attachments got replaced/removed.
        if (originalPhotoFile != photoFile) JournalMediaStore.delete(this, originalPhotoFile)
        if (originalVideoFile != videoFile) JournalMediaStore.delete(this, originalVideoFile)
        if (originalAudioFile != audioFile) JournalMediaStore.delete(this, originalAudioFile)

        JournalSyncManager.syncAsync(this)
        finish()
    }

    private fun confirmDelete() {
        val current = entry ?: return
        AlertDialog.Builder(this)
            .setTitle(R.string.delete_journal_title)
            .setMessage(R.string.delete_journal_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                JournalStore.delete(this, current.id)
                JournalMediaStore.delete(this, current.photoFile)
                JournalMediaStore.delete(this, current.videoFile)
                JournalMediaStore.delete(this, current.audioFile)
                JournalSyncManager.recordDeletion(this, current.id)
                JournalSyncManager.syncAsync(this)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    companion object {
        const val EXTRA_ENTRY_ID = "entry_id"
    }
}
