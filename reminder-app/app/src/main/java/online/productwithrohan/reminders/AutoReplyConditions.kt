package online.productwithrohan.reminders

import android.app.KeyguardManager
import android.bluetooth.BluetoothAdapter
import android.content.Context
import android.media.AudioManager
import android.os.BatteryManager

/**
 * Device-state gates for auto-reply, checked alongside sender filtering
 * before a reply actually goes out. Each toggle in [AutoReplySettings] is
 * independent and AND'd — e.g. "only reply while charging" plus "only while
 * screen is locked" means both have to hold.
 */
object AutoReplyConditions {

    /** True if every condition enabled in settings currently holds. */
    fun allSatisfied(context: Context): Boolean {
        if (AutoReplySettings.requireScreenLocked(context) && !isScreenLocked(context)) return false
        if (AutoReplySettings.requireCharging(context) && !isCharging(context)) return false
        if (AutoReplySettings.requireSilentOrDnd(context) && !isSilentOrDnd(context)) return false
        if (AutoReplySettings.requireBluetoothOn(context) && !isBluetoothOn()) return false
        return true
    }

    private fun isScreenLocked(context: Context): Boolean {
        val km = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        return km?.isKeyguardLocked == true
    }

    private fun isCharging(context: Context): Boolean {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        return bm?.isCharging == true
    }

    /** Ringer not NORMAL (silent/vibrate) counts, same as an active DND interruption filter. */
    private fun isSilentOrDnd(context: Context): Boolean {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
        if (am.ringerMode != AudioManager.RINGER_MODE_NORMAL) return true
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
        return nm?.currentInterruptionFilter?.let {
            it != android.app.NotificationManager.INTERRUPTION_FILTER_ALL
        } ?: false
    }

    /** Whether Bluetooth is switched on — not whether a device is actively connected. */
    private fun isBluetoothOn(): Boolean = try {
        BluetoothAdapter.getDefaultAdapter()?.isEnabled == true
    } catch (e: SecurityException) {
        false
    }
}
