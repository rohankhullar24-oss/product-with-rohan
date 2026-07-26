package online.productwithrohan.productshot

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val PREFS_NAME = "content_check_prefs"
private const val PREF_ARTICLE_ID = "article_id"
private const val NOTIFICATION_CHANNEL_ID = "new_content"
private const val NOTIFICATION_ID = 1
private const val LATEST_URL = "https://productwithrohan.online/api/productshot/latest"

class ContentCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val json = fetchLatest() ?: return@withContext Result.retry()
            val article = json.optJSONObject("article")
            val id = article?.optString("id", "") ?: ""
            if (id.isEmpty()) return@withContext Result.success()

            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val previousId = prefs.getString(PREF_ARTICLE_ID, null)
            prefs.edit().putString(PREF_ARTICLE_ID, id).apply()

            // Skip the very first check on a fresh install so the user isn't
            // notified about an article that already existed before install.
            if (previousId != null && previousId != id) {
                showNotification()
            }

            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    private fun fetchLatest(): JSONObject? {
        val connection = URL(LATEST_URL).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            if (connection.responseCode != 200) return null
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            JSONObject(body)
        } finally {
            connection.disconnect()
        }
    }

    private fun showNotification() {
        val context = applicationContext
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "New Content",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            manager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_OPEN_PATH, "/productshot/articles")
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("New Article")
            .setContentText("A new weekly article is live.")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        manager.notify(NOTIFICATION_ID, notification)
    }
}
