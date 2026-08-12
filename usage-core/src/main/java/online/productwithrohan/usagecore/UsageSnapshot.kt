package online.productwithrohan.usagecore

import org.json.JSONObject

/** One usage window: how much of it is spent, and when it rolls over. */
data class UsageWindow(
    /** Percent consumed, 0..100. */
    val utilization: Float,
    /** Absolute reset time in epoch millis, or 0 if the API gave us nothing usable. */
    val resetsAtEpochMillis: Long,
) {
    val hasReset: Boolean get() = resetsAtEpochMillis > 0L
}

/** A parsed reading of both limit windows at a point in time. */
data class UsageSnapshot(
    val session: UsageWindow,
    val weekly: UsageWindow,
    val fetchedAtEpochMillis: Long,
) {
    companion object {

        /**
         * Parses the usage payload, which looks like:
         *
         * ```
         * { "five_hour": { "utilization": 37, "resets_at": "2026-08-12T18:00:00+00:00" },
         *   "seven_day": { "utilization": 62, "resets_at": "2026-08-15T00:00:00+00:00" } }
         * ```
         *
         * Missing fields fall back to zero rather than throwing, so a partial
         * response still renders instead of blanking the widget.
         */
        fun parse(body: String, fetchedAtEpochMillis: Long): UsageSnapshot {
            val root = JSONObject(body)
            return UsageSnapshot(
                session = root.optJSONObject("five_hour").toWindow(),
                weekly = root.optJSONObject("seven_day").toWindow(),
                fetchedAtEpochMillis = fetchedAtEpochMillis,
            )
        }

        private fun JSONObject?.toWindow(): UsageWindow {
            if (this == null) return UsageWindow(0f, 0L)
            return UsageWindow(
                utilization = optDouble("utilization", 0.0).toFloat().coerceIn(0f, 100f),
                resetsAtEpochMillis = Rfc3339.toEpochMillis(optString("resets_at", "")),
            )
        }
    }
}
