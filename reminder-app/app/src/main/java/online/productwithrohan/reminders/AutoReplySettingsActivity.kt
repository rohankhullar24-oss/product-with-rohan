package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
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
    private lateinit var filterModeSpinner: Spinner
    private lateinit var allowedSendersRow: View
    private lateinit var allowedSendersInput: TextInputEditText
    private lateinit var ignoredSendersInput: TextInputEditText
    private lateinit var delayInput: TextInputEditText
    private lateinit var includeGroupsSwitch: MaterialSwitch
    private lateinit var requireScreenLockedSwitch: MaterialSwitch
    private lateinit var requireChargingSwitch: MaterialSwitch
    private lateinit var requireSilentOrDndSwitch: MaterialSwitch
    private lateinit var requireBluetoothOnSwitch: MaterialSwitch
    private lateinit var replyToMissedCallSwitch: MaterialSwitch

    private val filterModes = AutoReplyFilterMode.entries.toList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auto_reply_settings)
        title = getString(R.string.auto_reply_title)

        permissionBanner = findViewById(R.id.permission_banner)
        enabledSwitch = findViewById(R.id.switch_enabled)
        notifySwitch = findViewById(R.id.switch_notify)
        messageInput = findViewById(R.id.input_message)
        filterModeSpinner = findViewById(R.id.spinner_filter_mode)
        allowedSendersRow = findViewById(R.id.row_allowed_senders)
        allowedSendersInput = findViewById(R.id.input_allowed_senders)
        ignoredSendersInput = findViewById(R.id.input_ignored_senders)
        delayInput = findViewById(R.id.input_delay_seconds)
        includeGroupsSwitch = findViewById(R.id.switch_include_groups)
        requireScreenLockedSwitch = findViewById(R.id.switch_require_screen_locked)
        requireChargingSwitch = findViewById(R.id.switch_require_charging)
        requireSilentOrDndSwitch = findViewById(R.id.switch_require_silent_or_dnd)
        requireBluetoothOnSwitch = findViewById(R.id.switch_require_bluetooth_on)
        replyToMissedCallSwitch = findViewById(R.id.switch_reply_to_missed_call)

        val filterLabels = filterModes.map {
            when (it) {
                AutoReplyFilterMode.EVERYONE -> getString(R.string.auto_reply_filter_everyone)
                AutoReplyFilterMode.SPECIFIC -> getString(R.string.auto_reply_filter_specific)
            }
        }
        filterModeSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, filterLabels)
        filterModeSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                applyFilterModeVisibility(filterModes[position])
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        enabledSwitch.isChecked = AutoReplySettings.isEnabled(this)
        notifySwitch.isChecked = AutoReplySettings.notifyOnSend(this)
        messageInput.setText(AutoReplySettings.message(this))
        val currentMode = AutoReplySettings.filterMode(this)
        filterModeSpinner.setSelection(filterModes.indexOf(currentMode).coerceAtLeast(0))
        applyFilterModeVisibility(currentMode)
        allowedSendersInput.setText(AutoReplySettings.allowedSendersText(this))
        ignoredSendersInput.setText(AutoReplySettings.ignoredSendersText(this))
        delayInput.setText(AutoReplySettings.delaySeconds(this).toString())
        includeGroupsSwitch.isChecked = AutoReplySettings.includeGroups(this)
        requireScreenLockedSwitch.isChecked = AutoReplySettings.requireScreenLocked(this)
        requireChargingSwitch.isChecked = AutoReplySettings.requireCharging(this)
        requireSilentOrDndSwitch.isChecked = AutoReplySettings.requireSilentOrDnd(this)
        requireBluetoothOnSwitch.isChecked = AutoReplySettings.requireBluetoothOn(this)
        replyToMissedCallSwitch.isChecked = AutoReplySettings.replyToMissedCall(this)

        findViewById<Button>(R.id.button_manage_rules).setOnClickListener {
            startActivity(Intent(this, AutoReplyRuleListActivity::class.java))
        }
        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionBanner()
    }

    private fun applyFilterModeVisibility(mode: AutoReplyFilterMode) {
        allowedSendersRow.visibility = if (mode == AutoReplyFilterMode.SPECIFIC) View.VISIBLE else View.GONE
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
        val selectedFilterMode = filterModes[filterModeSpinner.selectedItemPosition.coerceIn(0, filterModes.lastIndex)]
        val delay = delayInput.text?.toString()?.toIntOrNull() ?: 0

        AutoReplySettings.save(
            context = this,
            enabled = enabledSwitch.isChecked,
            message = message,
            notifyOnSend = notifySwitch.isChecked,
            filterMode = selectedFilterMode,
            allowedSendersText = allowedSendersInput.text?.toString().orEmpty(),
            ignoredSendersText = ignoredSendersInput.text?.toString().orEmpty(),
            delaySeconds = delay,
            includeGroups = includeGroupsSwitch.isChecked,
            requireScreenLocked = requireScreenLockedSwitch.isChecked,
            requireCharging = requireChargingSwitch.isChecked,
            requireSilentOrDnd = requireSilentOrDndSwitch.isChecked,
            requireBluetoothOn = requireBluetoothOnSwitch.isChecked,
            replyToMissedCall = replyToMissedCallSwitch.isChecked,
        )
        finish()
    }
}
