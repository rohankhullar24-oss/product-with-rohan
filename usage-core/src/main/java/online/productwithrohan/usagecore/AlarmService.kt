package online.productwithrohan.usagecore

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
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

/**
 * Keeps the alarm ringing after the broadcast receiver returns. A foreground
 * service is what lets the sound continue and the full-screen activity stay up
 * while the app is closed and the phone is locked.
 *
 * Rings on the alarm stream so it is audible in quiet profiles, and gives up
 * after [RING_TIMEOUT_MS] so a missed reset doesn't drain the battery.
 */
class AlarmService : Service() {

    companion object {
        const val ACTION_START = "online.productwithrohan.usagecore.ALARM_START"
        const val ACTION_STOP = "online.productwithrohan.usagecore.ALARM_STOP"
        const val CHANNEL_ID = "limit_reset_ringing"

        private const val NOTIFICATION_ID = 4242
        private const val RING_TIMEOUT_MS = 5 * 60 * 1000L

        fun start(context: Context, window: ResetWindow) {
            val intent = Intent(context, AlarmService::class.java)
                .setAction(ACTION_START)
                .putExtra(ResetAlarmScheduler.EXTRA_WINDOW, window.key)
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
    private val stopHandler = Handler(Looper.getMainLooper())
    private val stopRunnable = Runnable { stopSelf() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        val window = ResetWindow.fromKey(
            intent?.getStringExtra(ResetAlarmScheduler.EXTRA_WINDOW)
        )
        if (window == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification(window))
        startRinging()

        // Show the full-screen UI; the notification's full-screen intent covers
        // the case where starting an activity from the background is blocked.
        startActivity(
            Intent(this, AlarmRingActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(ResetAlarmScheduler.EXTRA_WINDOW, window.key)
        )

        stopHandler.removeCallbacks(stopRunnable)
        stopHandler.postDelayed(stopRunnable, RING_TIMEOUT_MS)
        return START_NOT_STICKY
    }

    private fun buildNotification(window: ResetWindow): Notification {
        ensureChannel()

        val fullScreen = PendingIntent.getActivity(
            this,
            NOTIFICATION_ID,
            Intent(this, AlarmRingActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(ResetAlarmScheduler.EXTRA_WINDOW, window.key),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val dismiss = PendingIntent.getService(
            this,
            NOTIFICATION_ID + 1,
            Intent(this, AlarmService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.reset_notification_title, getString(window.titleRes)))
            .setContentText(getString(R.string.reset_notification_body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setFullScreenIntent(fullScreen, true)
            .addAction(0, getString(R.string.action_dismiss), dismiss)
            .build()
    }

    private fun ensureChannel() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.alarm_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.alarm_channel_description)
            // The service plays the tone itself, so the channel stays silent.
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    private fun startRinging() {
        if (player != null) return

        val tone = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

        try {
            player = MediaPlayer().apply {
                setDataSource(this@AlarmService, tone)
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
            val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            if (audio.getStreamVolume(AudioManager.STREAM_ALARM) == 0) {
                audio.setStreamVolume(
                    AudioManager.STREAM_ALARM,
                    audio.getStreamMaxVolume(AudioManager.STREAM_ALARM) / 2,
                    0,
                )
            }
        } catch (_: Exception) {
            player = null
        }

        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 600), 0))
    }

    override fun onDestroy() {
        stopHandler.removeCallbacks(stopRunnable)
        try {
            player?.stop()
            player?.release()
        } catch (_: Exception) {
            // Already released.
        }
        player = null
        vibrator?.cancel()
        vibrator = null
        super.onDestroy()
    }
}
