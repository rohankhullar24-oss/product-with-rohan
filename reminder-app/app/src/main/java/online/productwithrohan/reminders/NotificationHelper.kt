package online.productwithrohan.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

object NotificationHelper {

    const val CHANNEL_ID = "reminders"

    fun ensureChannel(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.channel_description)
            enableVibration(true)
        }
        nm.createNotificationChannel(channel)
    }

    fun notificationId(reminderId: String): Int = reminderId.hashCode() and 0x7FFFFFFF

    fun show(context: Context, reminder: Reminder, occurrenceDay: String) {
        ensureChannel(context)

        val openIntent = PendingIntent.getActivity(
            context, notificationId(reminder.id),
            Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val doneIntent = PendingIntent.getBroadcast(
            context, notificationId(reminder.id),
            Intent(context, NotificationActionReceiver::class.java)
                .setAction(NotificationActionReceiver.ACTION_DONE)
                .putExtra(AlarmScheduler.EXTRA_ID, reminder.id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = PendingIntent.getBroadcast(
            context, notificationId(reminder.id) - 1,
            Intent(context, NotificationActionReceiver::class.java)
                .setAction(NotificationActionReceiver.ACTION_SNOOZE)
                .putExtra(AlarmScheduler.EXTRA_ID, reminder.id)
                .putExtra(AlarmScheduler.EXTRA_OCCURRENCE_DAY, occurrenceDay),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val text = reminder.notes.ifBlank {
            if (reminder.nagIntervalMinutes > 0)
                context.getString(R.string.notification_nag_hint, reminder.nagIntervalMinutes)
            else ""
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(reminder.title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(openIntent)
            .setAutoCancel(false)
            .setOnlyAlertOnce(false)
            .addAction(0, context.getString(R.string.action_done), doneIntent)
            .addAction(0, context.getString(R.string.action_snooze), snoozeIntent)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        try {
            nm.notify(notificationId(reminder.id), notification)
        } catch (e: SecurityException) {
            // Notifications permission revoked; nothing else to do here.
        }
    }

    fun cancel(context: Context, reminderId: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(notificationId(reminderId))
    }
}
