package online.productwithrohan.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.core.app.NotificationCompat

/** "Auto-reply sent" / "Auto-forward sent" confirmation notifications, own channel from reminders'. */
object AutoTextNotify {

    private const val CHANNEL_ID = "auto_text_events"
    private var nextId = 500_000

    private fun ensureChannel(context: android.content.Context) {
        val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID, context.getString(R.string.auto_text_events_channel), NotificationManager.IMPORTANCE_LOW
        )
        nm.createNotificationChannel(channel)
    }

    fun show(context: android.content.Context, title: String, text: String) {
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .build()
        val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager
        try {
            nm.notify(nextId++, notification)
        } catch (e: SecurityException) {
            // Notifications permission revoked; nothing else to do here.
        }
    }
}
