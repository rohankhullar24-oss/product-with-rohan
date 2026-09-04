package online.productwithrohan.reminders

import android.app.KeyguardManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * A purely cosmetic "incoming call" screen — there's no real telephony
 * behind it, same as the reference app's Fake Call feature. Shows over the
 * lock screen and plays the default ringtone until Accept/Decline.
 */
class FakeCallActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_CALLER_NAME = "fake_call_caller_name"
    }

    private var ringtone: Ringtone? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()
        setContentView(R.layout.activity_fake_call)

        val callerName = intent.getStringExtra(EXTRA_CALLER_NAME)?.takeIf { it.isNotBlank() }
            ?: getString(R.string.fake_call_unknown_caller)
        findViewById<TextView>(R.id.caller_name).text = callerName

        findViewById<Button>(R.id.button_accept).setOnClickListener { finish() }
        findViewById<Button>(R.id.button_decline).setOnClickListener { finish() }

        playRingtone()
    }

    override fun onDestroy() {
        super.onDestroy()
        ringtone?.stop()
    }

    private fun playRingtone() {
        val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE) ?: return
        ringtone = RingtoneManager.getRingtone(this, uri)?.apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                streamType = AudioManager.STREAM_RING
            }
            play()
        }
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
}
