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

class AutoForwardSettingsActivity : AppCompatActivity() {

    private lateinit var permissionBanner: TextView
    private lateinit var enabledSwitch: MaterialSwitch
    private lateinit var notifySwitch: MaterialSwitch
    private lateinit var forwardToInput: TextInputEditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auto_forward_settings)
        title = getString(R.string.auto_forward_title)

        permissionBanner = findViewById(R.id.permission_banner)
        enabledSwitch = findViewById(R.id.switch_enabled)
        notifySwitch = findViewById(R.id.switch_notify)
        forwardToInput = findViewById(R.id.input_forward_to)

        enabledSwitch.isChecked = AutoForwardSettings.isEnabled(this)
        notifySwitch.isChecked = AutoForwardSettings.notifyOnSend(this)
        forwardToInput.setText(AutoForwardSettings.forwardTo(this))

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionBanner()
    }

    /** Auto forward needs both: notification access to see the message, accessibility to send it on. */
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
        val forwardTo = forwardToInput.text?.toString()?.trim().orEmpty()
        if (enabledSwitch.isChecked && forwardTo.isBlank()) {
            Toast.makeText(this, R.string.auto_forward_to_required, Toast.LENGTH_SHORT).show()
            return
        }
        AutoForwardSettings.save(this, enabledSwitch.isChecked, forwardTo, notifySwitch.isChecked)
        AutoSchedulerSyncManager.syncAsync(this)
        finish()
    }
}
