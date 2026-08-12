package online.productwithrohan.claudelimits.alarm

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import online.productwithrohan.claudelimits.R
import java.text.DateFormat
import java.util.Date

/**
 * The ringing screen: shows over the lock screen naming the window that just
 * reset, with one large Dismiss button. Silencing is handled in [onStop], so
 * every exit route — button, back, swiping away — stops the sound.
 */
class AlarmRingActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()
        setContentView(R.layout.activity_alarm_ring)

        bind(intent)

        findViewById<Button>(R.id.button_dismiss).setOnClickListener { finish() }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        bind(intent)
    }

    private fun bind(intent: Intent) {
        val window = ResetWindow.fromKey(intent.getStringExtra(ResetAlarmScheduler.EXTRA_WINDOW))

        findViewById<TextView>(R.id.alarm_headline).text = if (window != null) {
            getString(R.string.reset_headline, getString(window.titleRes))
        } else {
            getString(R.string.app_name)
        }
        findViewById<TextView>(R.id.alarm_body).setText(R.string.reset_body)
        findViewById<TextView>(R.id.alarm_time).text =
            DateFormat.getTimeInstance(DateFormat.SHORT).format(Date())
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            (getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager)
                .requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onStop() {
        super.onStop()
        AlarmService.stop(this)
    }
}
