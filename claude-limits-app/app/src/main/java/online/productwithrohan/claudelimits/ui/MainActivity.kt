package online.productwithrohan.claudelimits.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import online.productwithrohan.claudelimits.R
import online.productwithrohan.usagecore.ResetAlarmScheduler
import online.productwithrohan.usagecore.AuthState
import online.productwithrohan.usagecore.Store
import online.productwithrohan.usagecore.Countdown
import online.productwithrohan.usagecore.UsageWidgetProvider
import online.productwithrohan.usagecore.LoginActivity
import online.productwithrohan.usagecore.RefreshScheduler

/**
 * The full view behind the widget: both windows in detail, plus the permission
 * prompts that decide whether the reset alarm can actually ring.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var store: Store

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        store = Store.get(this)

        findViewById<Button>(R.id.button_refresh).setOnClickListener {
            RefreshScheduler.refreshNow(this)
            findViewById<TextView>(R.id.status_line).setText(R.string.refreshing)
        }

        findViewById<Button>(R.id.button_account).setOnClickListener {
            if (store.isSignedIn) signOut() else startActivity(Intent(this, LoginActivity::class.java))
        }

        findViewById<View>(R.id.banner_exact_alarms).setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM))
            }
        }

        findViewById<View>(R.id.banner_battery).setOnClickListener {
            startActivity(
                Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", packageName, null),
                )
            )
        }

        requestNotificationPermissionIfNeeded()
        RefreshScheduler.ensureScheduled(this)
    }

    override fun onResume() {
        super.onResume()
        render()
        if (store.isSignedIn) RefreshScheduler.refreshNow(this)
    }

    private fun render() {
        val signedIn = store.isSignedIn && store.authState != AuthState.NEEDS_LOGIN

        findViewById<Button>(R.id.button_account)
            .setText(if (store.isSignedIn) R.string.action_sign_out else R.string.action_sign_in)

        findViewById<View>(R.id.usage_container).visibility =
            if (signedIn && store.hasSnapshot) View.VISIBLE else View.GONE

        findViewById<TextView>(R.id.status_line).text = when {
            !store.isSignedIn -> getString(R.string.status_signed_out)
            store.authState == AuthState.NEEDS_LOGIN -> getString(R.string.status_session_expired)
            !store.hasSnapshot -> getString(R.string.status_waiting)
            else -> Countdown.age(this, store.fetchedAt)
        }

        bindWindow(
            R.id.detail_session_percent, R.id.detail_session_bar, R.id.detail_session_reset,
            store.sessionUtilization, store.sessionResetAt,
        )
        bindWindow(
            R.id.detail_weekly_percent, R.id.detail_weekly_bar, R.id.detail_weekly_reset,
            store.weeklyUtilization, store.weeklyResetAt,
        )

        findViewById<View>(R.id.banner_exact_alarms).visibility =
            if (ResetAlarmScheduler.canScheduleExact(this)) View.GONE else View.VISIBLE
    }

    private fun bindWindow(percentId: Int, barId: Int, resetId: Int, utilization: Float, resetAt: Long) {
        val percent = utilization.coerceAtLeast(0f).toInt()
        findViewById<TextView>(percentId).text = getString(R.string.percent_used, percent)
        findViewById<ProgressBar>(barId).progress = percent

        val relative = Countdown.relative(this, resetAt)
        val absolute = Countdown.absolute(resetAt)
        findViewById<TextView>(resetId).text =
            if (absolute.isBlank()) relative else "$relative · $absolute"
    }

    private fun signOut() {
        store.signOut()
        ResetAlarmScheduler.cancelAll(this)
        RefreshScheduler.cancelAll(this)
        UsageWidgetProvider.refreshAll(this)
        render()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }
}
