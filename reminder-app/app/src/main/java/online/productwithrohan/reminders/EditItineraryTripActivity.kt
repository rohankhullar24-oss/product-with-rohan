package online.productwithrohan.reminders

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/** Create or edit a trip: name + date range + notes. */
class EditItineraryTripActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TRIP_ID = "itinerary_trip_id"
    }

    private lateinit var trip: ItineraryTrip
    private var isNew = true

    private lateinit var nameInput: EditText
    private lateinit var notesInput: EditText
    private lateinit var startButton: Button
    private lateinit var endButton: Button

    private var startDate: LocalDate = LocalDate.now()
    private var endDate: LocalDate = LocalDate.now()

    private val fmt = DateTimeFormatter.ofPattern("d MMM yyyy")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_itinerary_trip)

        val existingId = intent.getStringExtra(EXTRA_TRIP_ID)
        val existing = existingId?.let { ItineraryTripStore.get(this, it) }
        isNew = existing == null
        trip = existing ?: ItineraryTrip()
        title = getString(if (isNew) R.string.itinerary_trip_title_new else R.string.itinerary_trip_title_edit)

        nameInput = findViewById(R.id.input_trip_name)
        notesInput = findViewById(R.id.input_trip_notes)
        startButton = findViewById(R.id.button_start_date)
        endButton = findViewById(R.id.button_end_date)

        nameInput.setText(trip.name)
        notesInput.setText(trip.notes)
        startDate = if (isNew) LocalDate.now() else trip.start()
        endDate = if (isNew) LocalDate.now() else trip.end()
        updateDateButtons()

        startButton.setOnClickListener { pickStart() }
        endButton.setOnClickListener { pickEnd() }

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        if (!isNew) {
            deleteButton.visibility = View.VISIBLE
            deleteButton.setOnClickListener { confirmDelete() }
        }
    }

    private fun pickStart() {
        DatePickerDialog(
            this,
            { _, y, m, d ->
                startDate = LocalDate.of(y, m + 1, d)
                if (endDate.isBefore(startDate)) endDate = startDate
                updateDateButtons()
            },
            startDate.year, startDate.monthValue - 1, startDate.dayOfMonth
        ).show()
    }

    private fun pickEnd() {
        DatePickerDialog(
            this,
            { _, y, m, d -> endDate = LocalDate.of(y, m + 1, d); updateDateButtons() },
            endDate.year, endDate.monthValue - 1, endDate.dayOfMonth
        ).show()
    }

    private fun updateDateButtons() {
        startButton.text = startDate.format(fmt)
        endButton.text = endDate.format(fmt)
    }

    private fun onSaveClicked() {
        val name = nameInput.text?.toString()?.trim().orEmpty()
        if (name.isEmpty()) {
            Toast.makeText(this, R.string.error_title_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (endDate.isBefore(startDate)) {
            Toast.makeText(this, R.string.itinerary_error_end_before_start, Toast.LENGTH_SHORT).show()
            return
        }
        trip.name = name
        trip.notes = notesInput.text?.toString()?.trim().orEmpty()
        trip.startDate = startDate.toString()
        trip.endDate = endDate.toString()
        trip.updatedAt = System.currentTimeMillis()
        ItineraryTripStore.upsert(this, trip)
        ItinerarySyncManager.syncAsync(this)
        ItineraryWidgetProvider.refreshAll(this)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.itinerary_delete_trip_title)
            .setMessage(R.string.itinerary_delete_trip_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                for (stop in ItineraryStopStore.getForTrip(this, trip.id)) {
                    RowSyncEngine.recordDeletion(this, ItinerarySyncManager.KIND_STOP, stop.id)
                }
                ItineraryStopStore.deleteForTrip(this, trip.id)
                RowSyncEngine.recordDeletion(this, ItinerarySyncManager.KIND_TRIP, trip.id)
                ItineraryTripStore.delete(this, trip.id)
                ItinerarySyncManager.syncAsync(this)
                ItineraryWidgetProvider.refreshAll(this)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
