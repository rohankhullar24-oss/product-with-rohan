package online.productwithrohan.reminders

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class EditAutoTaskActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TASK_ID = "auto_task_id"
        const val EXTRA_CHANNEL = "auto_task_channel"
    }

    private lateinit var task: AutoTask
    private var isNew = true
    private var pickedDate: LocalDate = LocalDate.now()
    private var pickedTime: LocalTime = LocalTime.now().plusMinutes(5)

    private lateinit var channelText: TextView
    private lateinit var labelLayout: TextInputLayout
    private lateinit var recipientLayout: TextInputLayout
    private lateinit var messageLayout: TextInputLayout
    private lateinit var labelInput: TextInputEditText
    private lateinit var recipientInput: TextInputEditText
    private lateinit var messageInput: TextInputEditText
    private lateinit var dateButton: Button
    private lateinit var timeButton: Button

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) saveInternal() else Toast.makeText(
                this, R.string.auto_permission_denied, Toast.LENGTH_SHORT
            ).show()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_auto_task)

        val existingId = intent.getStringExtra(EXTRA_TASK_ID)
        val existing = existingId?.let { AutoTaskStore.get(this, it) }
        isNew = existing == null
        val channel = existing?.channel
            ?: intent.getStringExtra(EXTRA_CHANNEL)?.let { AutoTaskChannel.valueOf(it) }
            ?: AutoTaskChannel.SMS
        task = existing ?: AutoTask(channel = channel)
        if (existing != null) {
            val dt = java.time.Instant.ofEpochMilli(existing.scheduledAt).atZone(ZoneId.systemDefault())
            pickedDate = dt.toLocalDate()
            pickedTime = dt.toLocalTime()
        }
        title = getString(if (isNew) R.string.auto_title_new else R.string.auto_title_edit)

        channelText = findViewById(R.id.text_channel)
        labelLayout = findViewById(R.id.layout_label)
        recipientLayout = findViewById(R.id.layout_recipient)
        messageLayout = findViewById(R.id.layout_message)
        labelInput = findViewById(R.id.input_label)
        recipientInput = findViewById(R.id.input_recipient)
        messageInput = findViewById(R.id.input_message)
        dateButton = findViewById(R.id.button_date)
        timeButton = findViewById(R.id.button_time)

        channelText.text = channelLabel(task.channel)
        labelInput.setText(task.label)
        recipientInput.setText(task.recipient)
        messageInput.setText(task.message)

        applyChannelVisibility(task.channel)
        updateDateTimeButtons()

        dateButton.setOnClickListener { pickDate() }
        timeButton.setOnClickListener { pickTime() }

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        if (!isNew) {
            deleteButton.visibility = View.VISIBLE
            deleteButton.setOnClickListener { confirmDelete() }
        }
    }

    private fun applyChannelVisibility(channel: AutoTaskChannel) {
        labelLayout.visibility = if (channel == AutoTaskChannel.REMINDER) View.VISIBLE else View.GONE
        recipientLayout.visibility =
            if (channel == AutoTaskChannel.SMS || channel == AutoTaskChannel.CALL) View.VISIBLE else View.GONE
        messageLayout.visibility =
            if (channel == AutoTaskChannel.SMS || channel == AutoTaskChannel.REMINDER) View.VISIBLE else View.GONE
        messageLayout.hint = if (channel == AutoTaskChannel.REMINDER)
            getString(R.string.auto_label_notes) else getString(R.string.auto_label_message)
    }

    private fun channelLabel(channel: AutoTaskChannel): String =
        getString(R.string.auto_channel_label, channel.name.lowercase().replaceFirstChar { it.uppercase() })

    private fun pickDate() {
        DatePickerDialog(
            this,
            { _, y, m, d ->
                pickedDate = LocalDate.of(y, m + 1, d)
                updateDateTimeButtons()
            },
            pickedDate.year, pickedDate.monthValue - 1, pickedDate.dayOfMonth
        ).show()
    }

    private fun pickTime() {
        TimePickerDialog(
            this,
            { _, h, min ->
                pickedTime = LocalTime.of(h, min)
                updateDateTimeButtons()
            },
            pickedTime.hour, pickedTime.minute, true
        ).show()
    }

    private fun updateDateTimeButtons() {
        dateButton.text = pickedDate.format(DateTimeFormatter.ofPattern("d MMM yyyy"))
        timeButton.text = pickedTime.format(DateTimeFormatter.ofPattern("HH:mm"))
    }

    private fun onSaveClicked() {
        task.label = labelInput.text?.toString()?.trim().orEmpty()
        task.recipient = recipientInput.text?.toString()?.trim().orEmpty()
        task.message = messageInput.text?.toString()?.trim().orEmpty()

        val scheduled = java.time.ZonedDateTime.of(pickedDate, pickedTime, ZoneId.systemDefault())
        if (scheduled.isBefore(java.time.ZonedDateTime.now())) {
            Toast.makeText(this, R.string.error_past_time, Toast.LENGTH_SHORT).show()
            return
        }
        task.scheduledAt = scheduled.toInstant().toEpochMilli()

        when (task.channel) {
            AutoTaskChannel.SMS, AutoTaskChannel.CALL -> if (task.recipient.isBlank()) {
                Toast.makeText(this, R.string.auto_error_recipient_required, Toast.LENGTH_SHORT).show()
                return
            }
            AutoTaskChannel.REMINDER -> if (task.label.isBlank()) {
                Toast.makeText(this, R.string.error_title_required, Toast.LENGTH_SHORT).show()
                return
            }
            else -> {}
        }
        if (task.channel == AutoTaskChannel.SMS && task.message.isBlank()) {
            Toast.makeText(this, R.string.auto_error_message_required, Toast.LENGTH_SHORT).show()
            return
        }

        val permission = when (task.channel) {
            AutoTaskChannel.SMS -> Manifest.permission.SEND_SMS
            AutoTaskChannel.CALL -> Manifest.permission.CALL_PHONE
            else -> null
        }
        if (permission != null &&
            ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED
        ) {
            permissionLauncher.launch(permission)
            return
        }
        saveInternal()
    }

    private fun saveInternal() {
        task.status = AutoTaskStatus.PENDING
        task.failureReason = null
        task.updatedAt = System.currentTimeMillis()
        AutoTaskStore.upsert(this, task)
        AutoTaskAlarmScheduler.schedule(this, task)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.auto_delete_title)
            .setMessage(R.string.auto_delete_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                AutoTaskAlarmScheduler.cancel(this, task.id)
                AutoTaskStore.delete(this, task.id)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
