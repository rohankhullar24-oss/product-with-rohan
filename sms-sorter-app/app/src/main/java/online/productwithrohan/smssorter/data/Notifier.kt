package online.productwithrohan.smssorter.data

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import online.productwithrohan.smssorter.MainActivity
import online.productwithrohan.smssorter.R
import online.productwithrohan.smssorter.core.Category

object Notifier {
    private const val CHANNEL_MESSAGES = "messages"
    private const val CHANNEL_PROMOS = "promotions"
    const val EXTRA_ADDRESS = "address"

    fun ensureChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_MESSAGES, "Messages", NotificationManager.IMPORTANCE_HIGH),
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_PROMOS, "Promotions (silent)", NotificationManager.IMPORTANCE_MIN),
        )
    }

    fun show(context: Context, title: String, body: String, address: String, category: Category) {
        if (context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        ensureChannels(context)
        val open = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_ADDRESS, address)
        val pi = PendingIntent.getActivity(
            context, address.hashCode(), open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val channel = if (category == Category.PROMOTIONS) CHANNEL_PROMOS else CHANNEL_MESSAGES
        val n = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_message)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(address.hashCode(), n)
    }
}
