package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.textfield.TextInputEditText

class AutoReplySettingsActivity : AppCompatActivity() {

    private lateinit var permissionBanner: TextView
    private lateinit var enabledSwitch: MaterialSwitch
    private lateinit var notifySwitch: MaterialSwitch
    private lateinit var messageInput: TextInputEditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auto_reply_settings)
        title = getString(R.string.auto_reply_title)

        permissionBanner = findViewById(R.id.permission_banner)
        enabledSwitch = findViewById(R.id.switch_enabled)
        notifySwitch = findViewById(R.id.switch_notify)
        messageInput = findViewById(R.id.input_message)

        enabledSwitch.isChecked = AutoReplySettings.isEnabled(this)
        notifySwitch.isChecked = AutoReplySettings.notifyOnSend(this)
        messageInput.setText(AutoReplySettings.message(this))

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionBanner()
    }

    /** Auto reply needs both: notification access to see the message, accessibility to send the reply. */
    private fun updatePermissionBanner() {
        val missingNotificationAccess = !AutoTextNotificationListenerService.isEnabled(this)
        val missingAccessibility = !AutoTextAccessibilityService.isEnabled(this)
        if (missingNotificationAccess) {
            permissionBanner.visibility = View.VISIBLE
            permissionBanner.text = getString(R.string.auto_notification_access_needed_message)
            permissionBanner.setOnClickListener {
                startActivity(Intent(android.provider.Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        } else if (missingAccessibility) {
            permissionBanner.visibility = View.VISIBLE
            permissionBanner.text = getString(R.string.auto_accessibility_needed_message)
            permissionBanner.setOnClickListener {
                startActivity(Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        } else {
            permissionBanner.visibility = View.GONE
        }
    }

    private fun onSaveClicked() {
        val message = messageInput.text?.toString()?.trim().orEmpty()
        if (enabledSwitch.isChecked && message.isBlank()) {
            Toast.makeText(this, R.string.auto_reply_message_required, Toast.LENGTH_SHORT).show()
            return
        }
        AutoReplySettings.save(this, enabledSwitch.isChecked, message, notifySwitch.isChecked)
        finish()
    }
}
