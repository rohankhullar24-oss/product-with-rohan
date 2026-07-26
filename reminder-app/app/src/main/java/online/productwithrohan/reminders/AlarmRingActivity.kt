package online.productwithrohan.reminders

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.text.DateFormat
import java.util.Date

/**
 * The ringing screen: shows over the lock screen with the reminder title and
 * two large buttons. Stopping the sound is the activity's job on the way out,
 * so every exit path (Done, Snooze, back) silences the alarm.
 */
class AlarmRingActivity : AppCompatActivity() {

    private var reminderId: String? = null
    private var occurrenceDay: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()
        setContentView(R.layout.activity_alarm_ring)

        reminderId = intent.getStringExtra(AlarmScheduler.EXTRA_ID)
        occurrenceDay = intent.getStringExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY).orEmpty()
        bind()

        findViewById<Button>(R.id.button_alarm_done).setOnClickListener {
            sendAction(NotificationActionReceiver.ACTION_DONE)
        }
        findViewById<Button>(R.id.button_alarm_snooze).setOnClickListener {
            sendAction(NotificationActionReceiver.ACTION_SNOOZE)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        reminderId = intent.getStringExtra(AlarmScheduler.EXTRA_ID)
        occurrenceDay = intent.getStringExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY).orEmpty()
        bind()
    }

    private fun bind() {
        val reminder = reminderId?.let { ReminderStore.get(this, it) }
        findViewById<TextView>(R.id.alarm_title).text =
            reminder?.title ?: getString(R.string.app_name)
        findViewById<TextView>(R.id.alarm_notes).text = reminder?.notes.orEmpty()
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

    private fun sendAction(action: String) {
        val id = reminderId ?: return finish()
        sendBroadcast(
            Intent(this, NotificationActionReceiver::class.java)
                .setAction(action)
                .putExtra(AlarmScheduler.EXTRA_ID, id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay)
        )
        finish()
    }

    override fun onStop() {
        super.onStop()
        // Leaving the screen by any route silences the ringing.
        AlarmService.stop(this)
    }
}
