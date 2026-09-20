package online.productwithrohan.reminders

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.HorizontalScrollView
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.R as MaterialR
import java.io.File
import java.text.DateFormat
import java.util.Date

/**
 * Add or edit one note: title + free text or a checklist, an optional color,
 * pinned/archived state, and image/drawing/audio attachments. There is no
 * explicit Save action — like Google Keep, every change is committed via
 * [onPause] (see [saveNow]); leaving a brand-new note completely empty
 * discards it instead of creating a blank row.
 */
class NoteEditActivity : AppCompatActivity() {

    private lateinit var rootContainer: View
    private lateinit var titleInput: android.widget.EditText
    private lateinit var bodyInput: android.widget.EditText
    private lateinit var checklistRecycler: androidx.recyclerview.widget.RecyclerView
    private lateinit var checklistAdapter: NoteChecklistAdapter
    private lateinit var imagesScroll: View
    private lateinit var imagesRow: LinearLayout
    private lateinit var audioList: LinearLayout
    private lateinit var metaText: TextView
    private lateinit var recordAudioButton: ImageButton

    private var note: Note = Note()
    private var isNew = true
    private var skipAutosave = false

    private var isChecklist = false
    private val checklistItems = mutableListOf<ChecklistItem>()
    private val images = mutableListOf<String>()
    private val audioFiles = mutableListOf<String>()

    private var isRecording = false
    private var recorder: MediaRecorder? = null
    private var recordingFile: File? = null
    private var player: MediaPlayer? = null
    private var playingFilename: String? = null
    private var pendingCameraFile: File? = null

    private val takePictureLauncher = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val file = pendingCameraFile
        pendingCameraFile = null
        if (success && file != null) addImage(NoteMediaStore.saveFromFile(this, file))
    }

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) addImage(NoteMediaStore.saveFromUri(this, uri))
    }

    private val drawingLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val path = result.data?.getStringExtra(DrawingActivity.EXTRA_RESULT_PATH) ?: return@registerForActivityResult
        addImage(NoteMediaStore.saveFromFile(this, File(path)))
    }

    private val recordAudioPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startRecording() else Toast.makeText(this, R.string.journal_audio_permission_denied, Toast.LENGTH_SHORT).show()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_note_edit)

        rootContainer = findViewById(R.id.root_container)
        titleInput = findViewById(R.id.input_title)
        bodyInput = findViewById(R.id.input_body)
        checklistRecycler = findViewById(R.id.checklist_recycler)
        imagesScroll = findViewById(R.id.images_scroll)
        imagesRow = findViewById(R.id.images_row)
        audioList = findViewById(R.id.audio_list)
        metaText = findViewById(R.id.meta_text)
        recordAudioButton = findViewById(R.id.button_record_audio)

        val existingId = intent.getStringExtra(EXTRA_NOTE_ID)
        val existing = existingId?.let { NoteStore.get(this, it) }
        isNew = existing == null
        note = existing ?: Note()

        titleInput.setText(note.title)
        bodyInput.setText(note.body)
        isChecklist = note.isChecklist
        checklistItems.addAll(note.checklist.map { it.copy() })
        images.addAll(note.images)
        audioFiles.addAll(note.audio)

        checklistAdapter = NoteChecklistAdapter(checklistItems) { /* committed on pause, see saveNow() */ }
        checklistRecycler.layoutManager = LinearLayoutManager(this)
        checklistRecycler.adapter = checklistAdapter

        updateChecklistVisibility()
        renderImages()
        renderAudio()
        renderMeta()
        applyColorBackground()

        findViewById<ImageButton>(R.id.button_add).setOnClickListener { showAddSheet() }
        findViewById<ImageButton>(R.id.button_color).setOnClickListener { showColorPicker() }
        recordAudioButton.setOnClickListener { onRecordTapped() }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.note_edit_menu, menu)
        return true
    }

    override fun onPrepareOptionsMenu(menu: Menu): Boolean {
        menu.findItem(R.id.action_pin_note).title = getString(if (note.pinned) R.string.note_unpin else R.string.note_pin)
        menu.findItem(R.id.action_toggle_checklist).title =
            getString(if (isChecklist) R.string.note_hide_checkboxes else R.string.note_show_checkboxes)
        menu.findItem(R.id.action_archive_note).title = getString(if (note.archived) R.string.note_unarchive else R.string.note_archive)
        menu.findItem(R.id.action_delete_note).isVisible = !isNew
        return super.onPrepareOptionsMenu(menu)
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_pin_note -> {
            note.pinned = !note.pinned
            saveNow()
            invalidateOptionsMenu()
            true
        }
        R.id.action_toggle_checklist -> {
            toggleChecklistMode()
            true
        }
        R.id.action_archive_note -> {
            note.archived = !note.archived
            saveNow()
            Toast.makeText(this, if (note.archived) R.string.note_archived_toast else R.string.note_unarchived_toast, Toast.LENGTH_SHORT).show()
            finish()
            true
        }
        R.id.action_share_note -> {
            shareNote()
            true
        }
        R.id.action_delete_note -> {
            confirmDelete()
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    override fun onPause() {
        super.onPause()
        if (isRecording) stopRecording()
        if (skipAutosave) return
        if (currentIsEmpty()) {
            if (!isNew) {
                RowSyncEngine.recordDeletion(this, NotesSyncManager.KIND_NOTE, note.id)
                NoteStore.delete(this, note.id)
                val mediaFiles = note.images + note.audio
                mediaFiles.forEach { NoteMediaStore.delete(this, it) }
                NotesSyncManager.syncAsync(this)
                isNew = true
            }
            return
        }
        saveNow()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAudioPlayback()
        NoteMediaStore.clearPlaybackCache(this)
    }

    // --- Checklist mode ---

    private fun toggleChecklistMode() {
        if (isChecklist) {
            bodyInput.setText(checklistItems.joinToString("\n") { it.text })
            isChecklist = false
        } else {
            val lines = bodyInput.text.toString().split("\n").filter { it.isNotBlank() }
            checklistItems.clear()
            checklistItems.addAll(lines.map { ChecklistItem(text = it) })
            checklistAdapter.notifyDataSetChanged()
            isChecklist = true
        }
        updateChecklistVisibility()
        saveNow()
        invalidateOptionsMenu()
    }

    private fun updateChecklistVisibility() {
        bodyInput.visibility = if (isChecklist) View.GONE else View.VISIBLE
        checklistRecycler.visibility = if (isChecklist) View.VISIBLE else View.GONE
    }

    // --- Add image/drawing/audio ---

    private fun showAddSheet() {
        val options = arrayOf(
            getString(R.string.note_add_image),
            getString(R.string.title_drawing),
            getString(R.string.note_add_audio),
        )
        AlertDialog.Builder(this)
            .setItems(options) { _, which ->
                when (which) {
                    0 -> chooseImageSource()
                    1 -> drawingLauncher.launch(Intent(this, DrawingActivity::class.java))
                    2 -> onRecordTapped()
                }
            }
            .show()
    }

    private fun chooseImageSource() {
        AlertDialog.Builder(this)
            .setItems(arrayOf(getString(R.string.journal_take_photo), getString(R.string.journal_action_gallery))) { _, which ->
                if (which == 0) {
                    launchCameraPhoto()
                } else {
                    pickImageLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }
            }
            .show()
    }

    private fun launchCameraPhoto() {
        val dir = File(cacheDir, "note_camera").apply { mkdirs() }
        val file = File(dir, "photo_${System.currentTimeMillis()}.jpg")
        pendingCameraFile = file
        takePictureLauncher.launch(FileProvider.getUriForFile(this, "$packageName.fileprovider", file))
    }

    // --- Images ---

    private fun renderImages() {
        imagesRow.removeAllViews()
        imagesScroll.visibility = if (images.isEmpty()) View.GONE else View.VISIBLE
        images.forEach { filename ->
            val view = layoutInflater.inflate(R.layout.item_note_image_thumb, imagesRow, false)
            NoteThumbnailLoader.load(view.findViewById<ImageView>(R.id.thumb_image), filename)
            view.findViewById<ImageButton>(R.id.thumb_remove).setOnClickListener { removeImage(filename) }
            imagesRow.addView(view)
        }
    }

    private fun addImage(filename: String) {
        images.add(filename)
        renderImages()
        saveNow()
    }

    private fun removeImage(filename: String) {
        images.remove(filename)
        renderImages()
        NoteMediaStore.delete(this, filename)
        saveNow()
        val appContext = applicationContext
        Thread { NotesSyncManager.deleteMediaBlocking(appContext, listOf(filename)) }.start()
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
        val file = File(cacheDir, "note_record_${System.currentTimeMillis()}.m4a")
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
            audioFiles.add(NoteMediaStore.saveFromFile(this, file))
            renderAudio()
            saveNow()
        } else {
            file?.delete()
        }
    }

    @Suppress("DEPRECATION")
    private fun newMediaRecorder(): MediaRecorder =
        if (Build.VERSION.SDK_INT >= 31) MediaRecorder(this) else MediaRecorder()

    private fun renderAudio() {
        audioList.removeAllViews()
        audioFiles.forEachIndexed { index, filename ->
            val view = layoutInflater.inflate(R.layout.item_note_audio_row, audioList, false)
            val playButton = view.findViewById<ImageButton>(R.id.audio_play)
            view.findViewById<TextView>(R.id.audio_label).text = getString(R.string.note_voice_note_numbered, index + 1)
            playButton.setImageResource(if (playingFilename == filename) R.drawable.ic_pause else R.drawable.ic_play)
            playButton.setOnClickListener { onPlayAudioTapped(filename) }
            view.findViewById<ImageButton>(R.id.audio_remove).setOnClickListener { removeAudio(filename) }
            audioList.addView(view)
        }
    }

    private fun removeAudio(filename: String) {
        if (playingFilename == filename) stopAudioPlayback()
        audioFiles.remove(filename)
        renderAudio()
        NoteMediaStore.delete(this, filename)
        saveNow()
        val appContext = applicationContext
        Thread { NotesSyncManager.deleteMediaBlocking(appContext, listOf(filename)) }.start()
    }

    private fun onPlayAudioTapped(filename: String) {
        if (playingFilename == filename) {
            stopAudioPlayback()
            return
        }
        stopAudioPlayback()
        Thread {
            val file = NoteMediaStore.openForPlayback(this, filename)
            runOnUiThread { if (file != null) startAudioPlayback(filename, file) }
        }.start()
    }

    private fun startAudioPlayback(filename: String, file: File) {
        player = MediaPlayer().apply {
            setDataSource(file.absolutePath)
            setOnCompletionListener { stopAudioPlayback() }
            prepare()
            start()
        }
        playingFilename = filename
        renderAudio()
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
        playingFilename = null
        if (::audioList.isInitialized) renderAudio()
    }

    private fun themeColor(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    // --- Color ---

    private fun showColorPicker() {
        val scroll = HorizontalScrollView(this)
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val pad = (16 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
        }
        scroll.addView(row)
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.note_change_color)
            .setView(scroll)
            .setNegativeButton(android.R.string.cancel, null)
            .create()

        val sizePx = (36 * resources.displayMetrics.density).toInt()
        val marginPx = (8 * resources.displayMetrics.density).toInt()
        Note.PALETTE.forEach { key ->
            val swatch = ImageButton(this).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(if (key == Note.COLOR_DEFAULT) themeSurfaceColor() else NoteColors.swatchFor(key))
                    val strokeColor = if (key == note.color) Color.BLACK else Color.parseColor("#33000000")
                    setStroke((1.5f * resources.displayMetrics.density).toInt(), strokeColor)
                }
                contentDescription = getString(NoteColors.labelRes(key))
                setOnClickListener {
                    note.color = key
                    applyColorBackground()
                    saveNow()
                    dialog.dismiss()
                }
            }
            val lp = LinearLayout.LayoutParams(sizePx, sizePx).apply {
                marginStart = marginPx
                marginEnd = marginPx
            }
            row.addView(swatch, lp)
        }
        dialog.show()
    }

    private fun applyColorBackground() {
        val isDark = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        val color = NoteColors.colorFor(note.color, isDark)
        rootContainer.setBackgroundColor(if (color == Color.TRANSPARENT) themeSurfaceColor() else color)
    }

    private fun themeSurfaceColor(): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(MaterialR.attr.colorSurface, typedValue, true)
        return typedValue.data
    }

    // --- Share ---

    private fun shareNote() {
        val body = if (isChecklist) {
            checklistItems.joinToString("\n") { "${if (it.checked) "☑" else "☐"} ${it.text}" }
        } else {
            bodyInput.text.toString()
        }
        val title = titleInput.text?.toString().orEmpty()
        val text = if (title.isBlank()) body else "$title\n\n$body"
        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }, null))
    }

    // --- Delete ---

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.note_delete_title)
            .setMessage(R.string.note_delete_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ -> deleteAndFinish() }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun deleteAndFinish() {
        skipAutosave = true
        RowSyncEngine.recordDeletion(this, NotesSyncManager.KIND_NOTE, note.id)
        NoteStore.delete(this, note.id)
        val mediaFiles = images + audioFiles
        mediaFiles.forEach { NoteMediaStore.delete(this, it) }
        NotesSyncManager.syncAsync(this)
        if (mediaFiles.isNotEmpty()) {
            val appContext = applicationContext
            Thread { NotesSyncManager.deleteMediaBlocking(appContext, mediaFiles) }.start()
        }
        finish()
    }

    // --- Save (autosave; there is no explicit Save action) ---

    private fun currentIsEmpty(): Boolean {
        val title = titleInput.text?.toString()?.trim().orEmpty()
        val body = if (isChecklist) "" else bodyInput.text?.toString()?.trim().orEmpty()
        val hasChecklist = isChecklist && checklistItems.any { it.text.isNotBlank() }
        return title.isEmpty() && body.isEmpty() && !hasChecklist && images.isEmpty() && audioFiles.isEmpty()
    }

    private fun saveNow() {
        if (skipAutosave || currentIsEmpty()) return
        note.title = titleInput.text?.toString()?.trim().orEmpty()
        note.body = if (isChecklist) "" else bodyInput.text?.toString().orEmpty()
        note.isChecklist = isChecklist
        note.checklist = checklistItems.toMutableList()
        note.images = images.toMutableList()
        note.audio = audioFiles.toMutableList()
        note.updatedAt = System.currentTimeMillis()
        NoteStore.upsert(this, note)
        isNew = false
        NotesSyncManager.syncAsync(this)
        renderMeta()
    }

    private fun renderMeta() {
        val millis = note.updatedAt.takeIf { it > 0 } ?: System.currentTimeMillis()
        metaText.text = getString(
            R.string.note_edited_at,
            DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(millis)),
        )
    }

    companion object {
        const val EXTRA_NOTE_ID = "note_id"
    }
}
