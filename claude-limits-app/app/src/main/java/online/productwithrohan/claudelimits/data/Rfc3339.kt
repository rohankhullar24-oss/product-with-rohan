package online.productwithrohan.claudelimits.data

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

/**
 * Parses the reset timestamps the usage endpoint returns, which carry an offset
 * and fractional seconds (e.g. "2026-08-12T18:00:00.483321+00:00").
 *
 * Returns 0 for anything unparseable so a format change degrades to "no alarm"
 * rather than crashing the widget.
 */
object Rfc3339 {

    fun toEpochMillis(value: String): Long {
        if (value.isBlank()) return 0L
        return try {
            OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()
        } catch (_: Exception) {
            0L
        }
    }
}
