package online.productwithrohan.reminders

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.textfield.TextInputEditText

class AutoSchedulerSettingsActivity : AppCompatActivity() {

    private lateinit var smsDelayInput: TextInputEditText
    private lateinit var smsSignatureSwitch: MaterialSwitch
    private lateinit var smsSignatureInput: TextInputEditText
    private lateinit var whatsAppSignatureSwitch: MaterialSwitch
    private lateinit var whatsAppSignatureInput: TextInputEditText
    private lateinit var notifyOnFailureSwitch: MaterialSwitch

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auto_scheduler_settings)
        title = getString(R.string.title_auto_scheduler_settings)

        smsDelayInput = findViewById(R.id.input_sms_delay)
        smsSignatureSwitch = findViewById(R.id.switch_sms_signature)
        smsSignatureInput = findViewById(R.id.input_sms_signature)
        whatsAppSignatureSwitch = findViewById(R.id.switch_whatsapp_signature)
        whatsAppSignatureInput = findViewById(R.id.input_whatsapp_signature)
        notifyOnFailureSwitch = findViewById(R.id.switch_notify_on_failure)

        smsDelayInput.setText(AutoSchedulerSettings.smsDelaySeconds(this).toString())
        smsSignatureSwitch.isChecked = AutoSchedulerSettings.smsSignatureEnabled(this)
        smsSignatureInput.setText(AutoSchedulerSettings.smsSignature(this))
        whatsAppSignatureSwitch.isChecked = AutoSchedulerSettings.whatsAppSignatureEnabled(this)
        whatsAppSignatureInput.setText(AutoSchedulerSettings.whatsAppSignature(this))
        notifyOnFailureSwitch.isChecked = AutoSchedulerSettings.notifyOnFailure(this)

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }
    }

    private fun onSaveClicked() {
        val delaySeconds = smsDelayInput.text?.toString()?.toIntOrNull() ?: 0
        AutoSchedulerSettings.save(
            this,
            smsSignatureEnabled = smsSignatureSwitch.isChecked,
            smsSignature = smsSignatureInput.text?.toString()?.trim().orEmpty(),
            whatsAppSignatureEnabled = whatsAppSignatureSwitch.isChecked,
            whatsAppSignature = whatsAppSignatureInput.text?.toString()?.trim().orEmpty(),
            smsDelaySeconds = delaySeconds,
        )
        AutoSchedulerSettings.setNotifyOnFailure(this, notifyOnFailureSwitch.isChecked)
        finish()
    }
}
