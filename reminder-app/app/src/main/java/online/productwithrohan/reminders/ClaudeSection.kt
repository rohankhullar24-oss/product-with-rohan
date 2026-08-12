package online.productwithrohan.reminders

import android.app.Activity
import android.content.Intent
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import online.productwithrohan.usagecore.AuthState
import online.productwithrohan.usagecore.Countdown
import online.productwithrohan.usagecore.LoginActivity
import online.productwithrohan.usagecore.RefreshScheduler
import online.productwithrohan.usagecore.Store

/**
 * The Claude limits strip above the reminder list.
 *
 * Kept out of [MainActivity] so the reminder screen's own logic stays readable;
 * it owns nothing but the views inside `claude_section`.
 */
class ClaudeSection(private val activity: Activity) {

    private val store = Store.get(activity)

    private val root: View = activity.findViewById(R.id.claude_section)
    private val connect: TextView = activity.findViewById(R.id.claude_connect)
    private val bars: View = activity.findViewById(R.id.claude_bars)
    private val sessionLine: TextView = activity.findViewById(R.id.claude_session_line)
    private val sessionBar: ProgressBar = activity.findViewById(R.id.claude_session_bar)
    private val weeklyLine: TextView = activity.findViewById(R.id.claude_weekly_line)
    private val weeklyBar: ProgressBar = activity.findViewById(R.id.claude_weekly_bar)
    private val alertsRow: TextView = activity.findViewById(R.id.claude_alerts_row)

    init {
        connect.setOnClickListener { if (!store.isSignedIn) signIn() }
        root.setOnClickListener { if (!store.isSignedIn) signIn() }
        alertsRow.setOnClickListener {
            if (store.isSignedIn) {
                activity.startActivity(Intent(activity, ClaudeAlertsActivity::class.java))
            } else {
                signIn()
            }
        }
    }

    fun render() {
        val signedIn = store.isSignedIn
        val expired = store.authState == AuthState.NEEDS_LOGIN
        val showBars = signedIn && !expired && store.hasSnapshot

        bars.visibility = if (showBars) View.VISIBLE else View.GONE
        connect.visibility = if (showBars) View.GONE else View.VISIBLE

        connect.setText(
            when {
                !signedIn -> R.string.claude_connect
                expired -> R.string.claude_session_expired
                else -> R.string.claude_waiting
            }
        )

        if (showBars) {
            bind(
                sessionLine, sessionBar,
                activity.getString(online.productwithrohan.usagecore.R.string.window_session),
                store.sessionUtilization, store.sessionResetAt,
            )
            bind(
                weeklyLine, weeklyBar,
                activity.getString(online.productwithrohan.usagecore.R.string.window_weekly),
                store.weeklyUtilization, store.weeklyResetAt,
            )
        }

        alertsRow.text = if (signedIn) alertsSummary() else activity.getString(R.string.claude_set_up_alerts)
    }

    /** Kicks off a fetch when the section is on screen and we have a session. */
    fun refreshIfSignedIn() {
        if (store.isSignedIn) {
            RefreshScheduler.ensureScheduled(activity)
            RefreshScheduler.refreshNow(activity)
        }
    }

    private fun bind(line: TextView, bar: ProgressBar, label: String, utilization: Float, resetAt: Long) {
        val percent = utilization.coerceIn(0f, 100f).toInt()
        bar.progress = percent
        line.text = activity.getString(
            R.string.claude_window_line,
            label,
            percent,
            Countdown.relative(activity, resetAt),
        )
    }

    private fun alertsSummary(): String {
        val warn = if (store.warnEnabled) {
            activity.getString(R.string.claude_alerts_warn_on, store.warnThresholdPercent)
        } else {
            activity.getString(R.string.claude_alerts_warn_off)
        }
        val ring = activity.getString(
            if (store.ringOnResetEnabled) R.string.claude_alerts_ring_on else R.string.claude_alerts_ring_off
        )
        return "$warn · $ring"
    }

    private fun signIn() {
        activity.startActivity(Intent(activity, LoginActivity::class.java))
    }
}
