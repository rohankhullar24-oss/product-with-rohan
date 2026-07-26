package online.productwithrohan.productshot

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
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
const val NOTIFICATION_CHANNEL_ID = "new_content"
private const val LATEST_URL = "https://productwithrohan.online/api/productshot/latest"

class ContentCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val json = fetchLatest() ?: return@withContext Result.retry()
            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val isFirstRun = !prefs.contains("shot_id")

            checkAndNotify(
                prefs, json, key = "shot", prefKey = "shot_id",
                title = "New Daily Shot", body = "A new practice question is up.",
                path = "/productshot/shots", notificationId = 1, isFirstRun = isFirstRun
            )
            checkAndNotify(
                prefs, json, key = "news", prefKey = "news_id",
                title = "New PM News", body = "A new news item was just posted.",
                path = "/productshot/news", notificationId = 2, isFirstRun = isFirstRun
            )
            checkAndNotify(
                prefs, json, key = "article", prefKey = "article_id",
                title = "New Article", body = "A new weekly article is live.",
                path = "/productshot/articles", notificationId = 3, isFirstRun = isFirstRun
            )

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

    private fun checkAndNotify(
        prefs: SharedPreferences,
        json: JSONObject,
        key: String,
        prefKey: String,
        title: String,
        body: String,
        path: String,
        notificationId: Int,
        isFirstRun: Boolean
    ) {
        val entry = json.optJSONObject(key) ?: return
        val id = entry.optString("id", "")
        if (id.isEmpty()) return

        val previousId = prefs.getString(prefKey, null)
        prefs.edit().putString(prefKey, id).apply()

        // Skip the very first check on a fresh install so the user isn't
        // notified about content that already existed before they installed.
        if (!isFirstRun && previousId != null && previousId != id) {
            showNotification(title, body, path, notificationId)
        }
    }

    private fun showNotification(title: String, body: String, path: String, notificationId: Int) {
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
            putExtra(MainActivity.EXTRA_OPEN_PATH, path)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        manager.notify(notificationId, notification)
    }
}
