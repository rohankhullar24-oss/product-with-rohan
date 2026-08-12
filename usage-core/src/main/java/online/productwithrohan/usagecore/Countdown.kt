package online.productwithrohan.usagecore

import android.content.Context
import java.text.DateFormat
import java.util.Date
import java.util.concurrent.TimeUnit

/**
 * Relative and absolute renderings of a reset time.
 *
 * The relative string can lag by up to a refresh interval, which is why the
 * absolute clock time is shown alongside it — that one never goes stale.
 */
object Countdown {

    fun relative(context: Context, targetEpochMillis: Long, now: Long = System.currentTimeMillis()): String {
        if (targetEpochMillis <= 0L) return context.getString(R.string.reset_unknown)

        val remaining = targetEpochMillis - now
        if (remaining <= 0L) return context.getString(R.string.reset_due)

        val days = TimeUnit.MILLISECONDS.toDays(remaining)
        val hours = TimeUnit.MILLISECONDS.toHours(remaining) % 24
        val minutes = TimeUnit.MILLISECONDS.toMinutes(remaining) % 60

        val amount = when {
            days > 0 -> context.getString(R.string.duration_days_hours, days, hours)
            hours > 0 -> context.getString(R.string.duration_hours_minutes, hours, minutes)
            else -> context.getString(R.string.duration_minutes, minutes.coerceAtLeast(1))
        }
        return context.getString(R.string.resets_in, amount)
    }

    fun absolute(targetEpochMillis: Long): String {
        if (targetEpochMillis <= 0L) return ""
        return DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(targetEpochMillis))
    }

    /** How stale the snapshot is, for the footer line. */
    fun age(context: Context, fetchedAtEpochMillis: Long, now: Long = System.currentTimeMillis()): String {
        if (fetchedAtEpochMillis <= 0L) return context.getString(R.string.updated_never)

        val elapsed = now - fetchedAtEpochMillis
        val minutes = TimeUnit.MILLISECONDS.toMinutes(elapsed)
        val hours = TimeUnit.MILLISECONDS.toHours(elapsed)
        val days = TimeUnit.MILLISECONDS.toDays(elapsed)

        return when {
            minutes < 1 -> context.getString(R.string.updated_just_now)
            minutes < 60 -> context.getString(R.string.updated_minutes, minutes)
            hours < 24 -> context.getString(R.string.updated_hours, hours)
            else -> context.getString(R.string.updated_days, days)
        }
    }
}
