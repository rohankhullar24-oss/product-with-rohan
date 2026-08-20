package online.productwithrohan.reminders

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

/** Add or edit one journal entry: a single free-form text field. */
class JournalEditActivity : AppCompatActivity() {

    private lateinit var textInput: EditText
    private var entry: JournalEntry? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_journal_edit)

        val existingId = intent.getStringExtra(EXTRA_ENTRY_ID)
        entry = existingId?.let { JournalStore.get(this, it) }
        title = getString(if (entry == null) R.string.title_new_journal else R.string.title_edit_journal)

        textInput = findViewById(R.id.input_text)
        textInput.setText(entry?.text)

        findViewById<Button>(R.id.button_save).setOnClickListener { save() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        deleteButton.visibility = if (entry == null) View.GONE else View.VISIBLE
        deleteButton.setOnClickListener { confirmDelete() }
    }

    private fun save() {
        val text = textInput.text.toString().trim()
        if (text.isEmpty()) {
            finish()
            return
        }
        val now = System.currentTimeMillis()
        val toSave = entry?.apply {
            this.text = text
            this.updatedAt = now
        } ?: JournalEntry(text = text, createdAt = now, updatedAt = now)
        JournalStore.upsert(this, toSave)
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
