package online.productwithrohan.reminders

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.textfield.TextInputEditText

class CallReplySettingsActivity : AppCompatActivity() {

    private lateinit var permissionBanner: TextView
    private lateinit var enabledSwitch: MaterialSwitch
    private lateinit var missedSwitch: MaterialSwitch
    private lateinit var endedSwitch: MaterialSwitch
    private lateinit var notifySwitch: MaterialSwitch
    private lateinit var messageInput: TextInputEditText

    private val requiredPermissions = arrayOf(
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.READ_CALL_LOG,
        Manifest.permission.SEND_SMS,
    )

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            if (results.values.all { it }) {
                saveInternal()
            } else {
                Toast.makeText(this, R.string.auto_permission_denied, Toast.LENGTH_SHORT).show()
                updatePermissionBanner()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_call_reply_settings)
        title = getString(R.string.call_reply_title)

        permissionBanner = findViewById(R.id.permission_banner)
        enabledSwitch = findViewById(R.id.switch_enabled)
        missedSwitch = findViewById(R.id.switch_reply_missed)
        endedSwitch = findViewById(R.id.switch_reply_ended)
        notifySwitch = findViewById(R.id.switch_notify)
        messageInput = findViewById(R.id.input_message)

        enabledSwitch.isChecked = CallReplySettings.isEnabled(this)
        missedSwitch.isChecked = CallReplySettings.replyToMissed(this)
        endedSwitch.isChecked = CallReplySettings.replyToEnded(this)
        notifySwitch.isChecked = CallReplySettings.notifyOnSend(this)
        messageInput.setText(CallReplySettings.message(this))

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionBanner()
    }

    private fun missingPermissions(): List<String> =
        requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

    private fun updatePermissionBanner() {
        if (missingPermissions().isEmpty()) {
            permissionBanner.visibility = View.GONE
            return
        }
        permissionBanner.visibility = View.VISIBLE
        permissionBanner.text = getString(R.string.forward_call_permission_needed_message)
        permissionBanner.setOnClickListener { permissionLauncher.launch(requiredPermissions) }
    }

    private fun onSaveClicked() {
        val message = messageInput.text?.toString()?.trim().orEmpty()
        if (enabledSwitch.isChecked && message.isBlank()) {
            Toast.makeText(this, R.string.call_reply_message_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (enabledSwitch.isChecked && missingPermissions().isNotEmpty()) {
            permissionLauncher.launch(requiredPermissions)
            return
        }
        saveInternal()
    }

    private fun saveInternal() {
        val message = messageInput.text?.toString()?.trim().orEmpty()
        CallReplySettings.save(
            this,
            enabledSwitch.isChecked,
            message,
            missedSwitch.isChecked,
            endedSwitch.isChecked,
            notifySwitch.isChecked,
        )
        finish()
    }
}
