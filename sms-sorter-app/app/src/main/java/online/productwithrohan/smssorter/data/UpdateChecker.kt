package online.productwithrohan.smssorter.data

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Checks the rolling `sms-sorter-app-latest` release for a newer build. CI publishes a
 * `version.json` next to the APK containing its versionCode (the CI run number).
 * Only that small file is downloaded; nothing about the phone or its messages is sent.
 */
object UpdateChecker {
    private const val RELEASE = "https://github.com/rohankhullar24-oss/product-with-rohan/releases/download/sms-sorter-app-latest"
    const val APK_URL = "$RELEASE/SmsSorter.apk"
    private const val VERSION_URL = "$RELEASE/version.json"

    fun installedVersion(context: Context): Long =
        context.packageManager.getPackageInfo(context.packageName, 0).longVersionCode

    /** The newest published versionCode, or null if it can't be fetched (offline, no release yet). */
    fun latestVersion(): Long? = runCatching {
        val conn = URL(VERSION_URL).openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000
        conn.readTimeout = 10_000
        conn.instanceFollowRedirects = true
        try {
            if (conn.responseCode != 200) return null
            JSONObject(conn.inputStream.bufferedReader().use { it.readText() }).getLong("versionCode")
        } finally {
            conn.disconnect()
        }
    }.getOrNull()

    /** The newer versionCode if an update is available, otherwise null. */
    fun availableUpdate(context: Context): Long? {
        val latest = latestVersion() ?: return null
        return latest.takeIf { it > installedVersion(context) }
    }
}
