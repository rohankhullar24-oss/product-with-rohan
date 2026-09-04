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

class ForwardCallSettingsActivity : AppCompatActivity() {

    private lateinit var permissionBanner: TextView
    private lateinit var enabledSwitch: MaterialSwitch
    private lateinit var notifySwitch: MaterialSwitch
    private lateinit var forwardToInput: TextInputEditText

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
        setContentView(R.layout.activity_forward_call_settings)
        title = getString(R.string.forward_call_title)

        permissionBanner = findViewById(R.id.permission_banner)
        enabledSwitch = findViewById(R.id.switch_enabled)
        notifySwitch = findViewById(R.id.switch_notify)
        forwardToInput = findViewById(R.id.input_forward_to)

        enabledSwitch.isChecked = ForwardCallSettings.isEnabled(this)
        notifySwitch.isChecked = ForwardCallSettings.notifyOnSend(this)
        forwardToInput.setText(ForwardCallSettings.forwardTo(this))

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
        val forwardTo = forwardToInput.text?.toString()?.trim().orEmpty()
        if (enabledSwitch.isChecked && forwardTo.isBlank()) {
            Toast.makeText(this, R.string.forward_call_to_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (enabledSwitch.isChecked && missingPermissions().isNotEmpty()) {
            permissionLauncher.launch(requiredPermissions)
            return
        }
        saveInternal()
    }

    private fun saveInternal() {
        val forwardTo = forwardToInput.text?.toString()?.trim().orEmpty()
        ForwardCallSettings.save(this, enabledSwitch.isChecked, forwardTo, notifySwitch.isChecked)
        finish()
    }
}
