package online.productwithrohan.reminders

/**
 * Plugs trips and stops into [RowSyncEngine] against the shared
 * `auto_scheduler_rows` table (kinds "itinerary_trip" / "itinerary_stop"),
 * the same way [AutoSchedulerSyncManager] does for Auto Scheduler's data
 * sets — no dedicated table needed.
 */
object ItinerarySyncManager {

    const val KIND_TRIP = "itinerary_trip"
    const val KIND_STOP = "itinerary_stop"

    @Volatile
    private var syncing = false

    /** Fire-and-forget background sync; onDone runs on the worker thread. */
    fun syncAsync(context: android.content.Context, onDone: ((changed: Boolean) -> Unit)? = null) {
        val app = context.applicationContext
        if (!SupabaseClient.isSignedIn(app)) {
            onDone?.invoke(false)
            return
        }
        Thread {
            var changed = false
            try {
                changed = syncBlocking(app)
            } catch (e: Exception) {
                // Offline or server hiccup -- local data is untouched, retry later.
            }
            onDone?.invoke(changed)
        }.start()
    }

    @Synchronized
    fun syncBlocking(context: android.content.Context): Boolean {
        if (syncing) return false
        syncing = true
        try {
            if (SupabaseClient.userId(context) == null) return false
            var changed = false
            changed = syncTrips(context) || changed
            changed = syncStops(context) || changed
            return changed
        } finally {
            syncing = false
        }
    }

    private fun syncTrips(context: android.content.Context): Boolean = RowSyncEngine.sync(
        context, KIND_TRIP, ItineraryTripStore.getAll(context),
        idOf = { it.id }, updatedAtOf = { it.updatedAt },
        toPayload = { it.toJson() }, fromPayload = { ItineraryTrip.fromJson(it) },
        replaceAllLocal = { ItineraryTripStore.replaceAll(context, it) },
    )

    private fun syncStops(context: android.content.Context): Boolean = RowSyncEngine.sync(
        context, KIND_STOP, ItineraryStopStore.getAll(context),
        idOf = { it.id }, updatedAtOf = { it.updatedAt },
        toPayload = { it.toJson() }, fromPayload = { ItineraryStop.fromJson(it) },
        replaceAllLocal = { ItineraryStopStore.replaceAll(context, it) },
    )
}
