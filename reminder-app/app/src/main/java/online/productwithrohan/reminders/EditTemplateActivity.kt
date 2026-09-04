package online.productwithrohan.reminders

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText

class EditTemplateActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TEMPLATE_ID = "template_id"
    }

    private lateinit var template: Template
    private var isNew = true
    private lateinit var nameInput: TextInputEditText
    private lateinit var messageInput: TextInputEditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_template)

        val existingId = intent.getStringExtra(EXTRA_TEMPLATE_ID)
        val existing = existingId?.let { TemplateStore.get(this, it) }
        isNew = existing == null
        template = existing ?: Template()
        title = getString(if (isNew) R.string.template_title_new else R.string.template_title_edit)

        nameInput = findViewById(R.id.input_name)
        messageInput = findViewById(R.id.input_message)
        nameInput.setText(template.name)
        messageInput.setText(template.message)

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        if (!isNew) {
            deleteButton.visibility = View.VISIBLE
            deleteButton.setOnClickListener { confirmDelete() }
        }
    }

    private fun onSaveClicked() {
        val name = nameInput.text?.toString()?.trim().orEmpty()
        val message = messageInput.text?.toString()?.trim().orEmpty()
        if (name.isBlank()) {
            Toast.makeText(this, R.string.error_title_required, Toast.LENGTH_SHORT).show()
            return
        }
        template.name = name
        template.message = message
        TemplateStore.upsert(this, template)
        AutoSchedulerSyncManager.syncAsync(this)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.template_delete_title)
            .setMessage(R.string.template_delete_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                RowSyncEngine.recordDeletion(this, "template", template.id)
                TemplateStore.delete(this, template.id)
                AutoSchedulerSyncManager.syncAsync(this)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
