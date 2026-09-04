package online.productwithrohan.reminders

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText

class EditRecipientListActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_LIST_ID = "recipient_list_id"
    }

    private lateinit var list: RecipientList
    private var isNew = true
    private lateinit var nameInput: TextInputEditText
    private lateinit var membersContainer: LinearLayout

    /** Row EditText refs, parallel to [list].members, so edits survive a re-render. */
    private val rowInputs = mutableListOf<Pair<TextInputEditText, TextInputEditText>>()

    private val importFileLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri == null) return@registerForActivityResult
            try {
                val text = contentResolver.openInputStream(uri)?.use { input ->
                    input.readBytes().decodeToString()
                } ?: throw IllegalStateException("empty file")
                val imported = RecipientImportParser.parse(text)
                if (imported.isEmpty()) {
                    Toast.makeText(this, R.string.recipient_list_import_failed, Toast.LENGTH_SHORT).show()
                    return@registerForActivityResult
                }
                syncFromViews()
                list.members.removeAll { it.phone.isBlank() && it.name.isBlank() }
                list.members.addAll(imported)
                renderMembers()
                Toast.makeText(this, getString(R.string.recipient_list_import_done, imported.size), Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, R.string.recipient_list_import_failed, Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_recipient_list)

        val existingId = intent.getStringExtra(EXTRA_LIST_ID)
        val existing = existingId?.let { RecipientListStore.get(this, it) }
        isNew = existing == null
        list = existing ?: RecipientList()
        title = getString(if (isNew) R.string.recipient_list_title_new else R.string.recipient_list_title_edit)

        nameInput = findViewById(R.id.input_name)
        membersContainer = findViewById(R.id.members_container)
        nameInput.setText(list.name)

        if (list.members.isEmpty()) list.members.add(RecipientEntry())
        renderMembers()

        findViewById<Button>(R.id.button_add_member).setOnClickListener {
            syncFromViews()
            list.members.add(RecipientEntry())
            renderMembers()
        }

        findViewById<Button>(R.id.button_import_file).setOnClickListener {
            importFileLauncher.launch(arrayOf("*/*"))
        }

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        if (!isNew) {
            deleteButton.visibility = View.VISIBLE
            deleteButton.setOnClickListener { confirmDelete() }
        }
    }

    /** Reads whatever's currently typed in each row back into [list].members. */
    private fun syncFromViews() {
        rowInputs.forEachIndexed { index, (nameField, phoneField) ->
            list.members[index].name = nameField.text?.toString()?.trim().orEmpty()
            list.members[index].phone = phoneField.text?.toString()?.trim().orEmpty()
        }
    }

    private fun renderMembers() {
        membersContainer.removeAllViews()
        rowInputs.clear()
        list.members.forEachIndexed { index, member ->
            val row = LayoutInflater.from(this)
                .inflate(R.layout.item_recipient_entry, membersContainer, false)
            val nameField = row.findViewById<TextInputEditText>(R.id.entry_name)
            val phoneField = row.findViewById<TextInputEditText>(R.id.entry_phone)
            nameField.setText(member.name)
            phoneField.setText(member.phone)
            row.findViewById<ImageButton>(R.id.entry_remove).setOnClickListener {
                syncFromViews()
                list.members.removeAt(index)
                if (list.members.isEmpty()) list.members.add(RecipientEntry())
                renderMembers()
            }
            rowInputs.add(nameField to phoneField)
            membersContainer.addView(row)
        }
    }

    private fun onSaveClicked() {
        syncFromViews()
        val name = nameInput.text?.toString()?.trim().orEmpty()
        val members = list.members.filter { it.phone.isNotBlank() }
        if (name.isBlank()) {
            Toast.makeText(this, R.string.error_title_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (members.isEmpty()) {
            Toast.makeText(this, R.string.recipient_list_error_empty, Toast.LENGTH_SHORT).show()
            return
        }
        list.name = name
        list.members = members.toMutableList()
        RecipientListStore.upsert(this, list)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.recipient_list_delete_title)
            .setMessage(R.string.recipient_list_delete_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                RecipientListStore.delete(this, list.id)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
