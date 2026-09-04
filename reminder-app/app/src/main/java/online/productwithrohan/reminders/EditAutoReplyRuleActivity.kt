package online.productwithrohan.reminders

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText

class EditAutoReplyRuleActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_RULE_ID = "auto_reply_rule_id"
    }

    private lateinit var rule: AutoReplyRule
    private var isNew = true
    private lateinit var senderInput: TextInputEditText
    private lateinit var messageInput: TextInputEditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_auto_reply_rule)

        val existingId = intent.getStringExtra(EXTRA_RULE_ID)
        val existing = existingId?.let { AutoReplyRuleStore.get(this, it) }
        isNew = existing == null
        rule = existing ?: AutoReplyRule()
        title = getString(if (isNew) R.string.auto_reply_rule_title_new else R.string.auto_reply_rule_title_edit)

        senderInput = findViewById(R.id.input_sender)
        messageInput = findViewById(R.id.input_message)
        senderInput.setText(rule.senderName)
        messageInput.setText(rule.message)

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        if (!isNew) {
            deleteButton.visibility = View.VISIBLE
            deleteButton.setOnClickListener { confirmDelete() }
        }
    }

    private fun onSaveClicked() {
        val sender = senderInput.text?.toString()?.trim().orEmpty()
        val message = messageInput.text?.toString()?.trim().orEmpty()
        if (sender.isBlank()) {
            Toast.makeText(this, R.string.auto_reply_rule_sender_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (message.isBlank()) {
            Toast.makeText(this, R.string.auto_reply_message_required, Toast.LENGTH_SHORT).show()
            return
        }
        rule.senderName = sender
        rule.message = message
        AutoReplyRuleStore.upsert(this, rule)
        AutoSchedulerSyncManager.syncAsync(this)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.auto_reply_rule_delete_title)
            .setMessage(R.string.auto_reply_rule_delete_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                RowSyncEngine.recordDeletion(this, "auto_reply_rule", rule.id)
                AutoReplyRuleStore.delete(this, rule.id)
                AutoSchedulerSyncManager.syncAsync(this)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
