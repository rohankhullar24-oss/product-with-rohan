package online.productwithrohan.reminders

import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import online.productwithrohan.usagecore.ResetAlarmScheduler
import online.productwithrohan.usagecore.Store

/**
 * The two Claude alert toggles.
 *
 * Warning before you run out is on by default — it's the alert that can still
 * change what you do. Ringing on reset is off by default here, because the
 * standalone Claude Limits app already rings and two installed apps would fire
 * at the same moment.
 */
class ClaudeAlertsActivity : AppCompatActivity() {

    /** Coarse steps read better on a slider than every integer percent. */
    private val thresholds = listOf(50, 60, 70, 75, 80, 85, 90, 95)

    private lateinit var store: Store
    private lateinit var thresholdLabel: TextView
    private lateinit var thresholdSeek: SeekBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_claude_alerts)
        title = getString(R.string.claude_alerts_title)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        store = Store.get(this)
        thresholdLabel = findViewById(R.id.threshold_label)
        thresholdSeek = findViewById(R.id.threshold_seek)

        val warnSwitch = findViewById<SwitchCompat>(R.id.switch_warn)
        warnSwitch.isChecked = store.warnEnabled
        warnSwitch.setOnCheckedChangeListener { _, checked ->
            store.warnEnabled = checked
            updateThresholdEnabled()
        }

        thresholdSeek.max = thresholds.lastIndex
        thresholdSeek.progress = nearestIndex(store.warnThresholdPercent)
        thresholdSeek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(bar: SeekBar, progress: Int, fromUser: Boolean) {
                store.warnThresholdPercent = thresholds[progress]
                renderThresholdLabel()
            }

            override fun onStartTrackingTouch(bar: SeekBar) = Unit
            override fun onStopTrackingTouch(bar: SeekBar) = Unit
        })

        val ringSwitch = findViewById<SwitchCompat>(R.id.switch_ring)
        ringSwitch.isChecked = store.ringOnResetEnabled
        ringSwitch.setOnCheckedChangeListener { _, checked ->
            store.ringOnResetEnabled = checked
            // Apply immediately rather than waiting for the next refresh, so
            // turning it off silences an already-armed alarm.
            if (checked) ResetAlarmScheduler.sync(this) else ResetAlarmScheduler.cancelAll(this)
            updateExactAlarmBanner()
        }

        findViewById<View>(R.id.exact_alarm_banner).setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                startActivity(
                    android.content.Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                        .setData(Uri.parse("package:$packageName"))
                )
            }
        }

        findViewById<Button>(R.id.button_sign_out_claude).setOnClickListener {
            store.signOut()
            ResetAlarmScheduler.cancelAll(this)
            finish()
        }

        renderThresholdLabel()
        updateThresholdEnabled()
    }

    override fun onResume() {
        super.onResume()
        updateExactAlarmBanner()
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun renderThresholdLabel() {
        thresholdLabel.text = getString(R.string.alerts_threshold_label, store.warnThresholdPercent)
    }

    private fun updateThresholdEnabled() {
        val enabled = store.warnEnabled
        thresholdSeek.isEnabled = enabled
        thresholdLabel.alpha = if (enabled) 1f else 0.4f
    }

    /** Only relevant while the reset alarm is on — a late ring is the failure it warns about. */
    private fun updateExactAlarmBanner() {
        val needed = store.ringOnResetEnabled && !ResetAlarmScheduler.canScheduleExact(this)
        findViewById<View>(R.id.exact_alarm_banner).visibility =
            if (needed) View.VISIBLE else View.GONE
    }

    private fun nearestIndex(percent: Int): Int {
        var best = 0
        thresholds.forEachIndexed { index, value ->
            if (kotlin.math.abs(value - percent) < kotlin.math.abs(thresholds[best] - percent)) {
                best = index
            }
        }
        return best
    }
}
