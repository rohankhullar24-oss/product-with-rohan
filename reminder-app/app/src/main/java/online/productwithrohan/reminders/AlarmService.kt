package online.productwithrohan.reminders

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

/**
 * Keeps the alarm ringing after the broadcast receiver returns. A foreground
 * service is what lets the sound continue and the full-screen activity stay up
 * while the app is closed and the phone is locked.
 *
 * Rings on the ALARM stream so it is audible even in vibrate/silent-adjacent
 * profiles, and gives up after RING_TIMEOUT_MS so a missed alarm doesn't drain
 * the battery — the nag chain then re-fires it later.
 */
class AlarmService : Service() {

    companion object {
        const val ACTION_START = "online.productwithrohan.reminders.ALARM_START"
        const val ACTION_STOP = "online.productwithrohan.reminders.ALARM_STOP"
        const val CHANNEL_ID = "alarm_ringing"
        private const val NOTIFICATION_ID = 424242
        private const val RING_TIMEOUT_MS = 10 * 60 * 1000L

        fun start(context: Context, reminderId: String, occurrenceDay: String) {
            val intent = Intent(context, AlarmService::class.java)
                .setAction(ACTION_START)
                .putExtra(AlarmScheduler.EXTRA_ID, reminderId)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.startService(
                Intent(context, AlarmService::class.java).setAction(ACTION_STOP)
            )
        }
    }

    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private val stopHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val stopRunnable = Runnable { stopSelf() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        val reminderId = intent?.getStringExtra(AlarmScheduler.EXTRA_ID)
        val occurrenceDay = intent?.getStringExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY).orEmpty()
        val reminder = reminderId?.let { ReminderStore.get(this, it) }
        if (reminder == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification(reminder, occurrenceDay))
        startRinging()

        // Show the full-screen alarm UI; the full-screen intent on the
        // notification covers the case where a background start is blocked.
        startActivity(
            Intent(this, AlarmRingActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(AlarmScheduler.EXTRA_ID, reminder.id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay)
        )

        stopHandler.removeCallbacks(stopRunnable)
        stopHandler.postDelayed(stopRunnable, RING_TIMEOUT_MS)
        return START_NOT_STICKY
    }

    private fun buildNotification(reminder: Reminder, occurrenceDay: String): Notification {
        ensureChannel()

        val fullScreen = PendingIntent.getActivity(
            this, NOTIFICATION_ID,
            Intent(this, AlarmRingActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(AlarmScheduler.EXTRA_ID, reminder.id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val doneIntent = PendingIntent.getBroadcast(
            this, NOTIFICATION_ID + 1,
            Intent(this, NotificationActionReceiver::class.java)
                .setAction(NotificationActionReceiver.ACTION_DONE)
                .putExtra(AlarmScheduler.EXTRA_ID, reminder.id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = PendingIntent.getBroadcast(
            this, NOTIFICATION_ID + 2,
            Intent(this, NotificationActionReceiver::class.java)
                .setAction(NotificationActionReceiver.ACTION_SNOOZE)
                .putExtra(AlarmScheduler.EXTRA_ID, reminder.id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(reminder.title)
            .setContentText(reminder.notes.ifBlank { getString(R.string.alarm_ringing) })
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setFullScreenIntent(fullScreen, true)
            .addAction(0, getString(R.string.action_done), doneIntent)
            .addAction(0, getString(R.string.action_snooze), snoozeIntent)
            .build()
    }

    private fun ensureChannel() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.alarm_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = getString(R.string.alarm_channel_description)
            // The service plays the tone itself, so the channel stays silent.
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        nm.createNotificationChannel(channel)
    }

    private fun startRinging() {
        if (player != null) return

        val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

        try {
            player = MediaPlayer().apply {
                setDataSource(this@AlarmService, uri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            // Alarms should be audible even if the alarm stream was turned down.
            val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            if (am.getStreamVolume(AudioManager.STREAM_ALARM) == 0) {
                am.setStreamVolume(
                    AudioManager.STREAM_ALARM,
                    am.getStreamMaxVolume(AudioManager.STREAM_ALARM) / 2,
                    0
                )
            }
        } catch (e: Exception) {
            player = null
        }

        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        val pattern = longArrayOf(0, 700, 600)
        vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
    }

    override fun onDestroy() {
        stopHandler.removeCallbacks(stopRunnable)
        try {
            player?.stop()
            player?.release()
        } catch (e: Exception) {
            // Already released.
        }
        player = null
        vibrator?.cancel()
        vibrator = null
        super.onDestroy()
    }
}
