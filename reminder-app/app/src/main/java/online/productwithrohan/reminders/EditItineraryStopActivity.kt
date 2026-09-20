package online.productwithrohan.reminders

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Create or edit a stop within a trip: title, date (clamped to the trip's range), optional time, location, notes. */
class EditItineraryStopActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TRIP_ID = "itinerary_trip_id"
        const val EXTRA_STOP_ID = "itinerary_stop_id"
        const val EXTRA_STOP_DATE = "itinerary_stop_date"
    }

    private lateinit var trip: ItineraryTrip
    private lateinit var stop: ItineraryStop
    private var isNew = true

    private lateinit var titleInput: EditText
    private lateinit var locationInput: EditText
    private lateinit var notesInput: EditText
    private lateinit var dateButton: Button
    private lateinit var timeButton: Button
    private lateinit var timeClearButton: ImageButton

    private var pickedDate: LocalDate = LocalDate.now()
    private var pickedTime: LocalTime? = null

    private val dateFmt = DateTimeFormatter.ofPattern("d MMM yyyy")
    private val timeFmt = DateTimeFormatter.ofPattern("HH:mm")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val tripId = intent.getStringExtra(EXTRA_TRIP_ID)
        val existingTrip = tripId?.let { ItineraryTripStore.get(this, it) }
        if (existingTrip == null) {
            finish()
            return
        }
        trip = existingTrip

        setContentView(R.layout.activity_edit_itinerary_stop)

        val existingId = intent.getStringExtra(EXTRA_STOP_ID)
        val existing = existingId?.let { ItineraryStopStore.get(this, it) }
        isNew = existing == null
        stop = existing ?: ItineraryStop(
            tripId = trip.id,
            date = intent.getStringExtra(EXTRA_STOP_DATE) ?: trip.startDate,
        )
        title = getString(if (isNew) R.string.itinerary_stop_title_new else R.string.itinerary_stop_title_edit)

        titleInput = findViewById(R.id.input_stop_title)
        locationInput = findViewById(R.id.input_stop_location)
        notesInput = findViewById(R.id.input_stop_notes)
        dateButton = findViewById(R.id.button_stop_date)
        timeButton = findViewById(R.id.button_stop_time)
        timeClearButton = findViewById(R.id.button_clear_time)

        titleInput.setText(stop.title)
        locationInput.setText(stop.location)
        notesInput.setText(stop.notes)
        pickedDate = runCatching { LocalDate.parse(stop.date) }.getOrDefault(trip.start())
        pickedTime = stop.time?.let { runCatching { LocalTime.parse(it) }.getOrNull() }
        updateDateTimeButtons()

        dateButton.setOnClickListener { pickDate() }
        timeButton.setOnClickListener { pickTime() }
        timeClearButton.setOnClickListener { pickedTime = null; updateDateTimeButtons() }

        findViewById<Button>(R.id.button_save).setOnClickListener { onSaveClicked() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        if (!isNew) {
            deleteButton.visibility = View.VISIBLE
            deleteButton.setOnClickListener { confirmDelete() }
        }
    }

    private fun pickDate() {
        val dialog = DatePickerDialog(
            this,
            { _, y, m, d -> pickedDate = LocalDate.of(y, m + 1, d); updateDateTimeButtons() },
            pickedDate.year, pickedDate.monthValue - 1, pickedDate.dayOfMonth
        )
        val zone = ZoneId.systemDefault()
        dialog.datePicker.minDate = trip.start().atStartOfDay(zone).toInstant().toEpochMilli()
        dialog.datePicker.maxDate = trip.end().atStartOfDay(zone).toInstant().toEpochMilli()
        dialog.show()
    }

    private fun pickTime() {
        val base = pickedTime ?: LocalTime.of(9, 0)
        TimePickerDialog(
            this,
            { _, h, min -> pickedTime = LocalTime.of(h, min); updateDateTimeButtons() },
            base.hour, base.minute, true
        ).show()
    }

    private fun updateDateTimeButtons() {
        dateButton.text = pickedDate.format(dateFmt)
        val time = pickedTime
        timeButton.text = time?.format(timeFmt) ?: getString(R.string.itinerary_no_time)
        timeClearButton.visibility = if (time != null) View.VISIBLE else View.GONE
    }

    private fun onSaveClicked() {
        val title = titleInput.text?.toString()?.trim().orEmpty()
        if (title.isEmpty()) {
            Toast.makeText(this, R.string.error_title_required, Toast.LENGTH_SHORT).show()
            return
        }
        stop.title = title
        stop.location = locationInput.text?.toString()?.trim().orEmpty()
        stop.notes = notesInput.text?.toString()?.trim().orEmpty()
        stop.date = pickedDate.toString()
        stop.time = pickedTime?.format(timeFmt)
        stop.updatedAt = System.currentTimeMillis()
        ItineraryStopStore.upsert(this, stop)
        ItinerarySyncManager.syncAsync(this)
        ItineraryWidgetProvider.refreshAll(this)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.itinerary_delete_stop_title)
            .setMessage(R.string.itinerary_delete_stop_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                RowSyncEngine.recordDeletion(this, ItinerarySyncManager.KIND_STOP, stop.id)
                ItineraryStopStore.delete(this, stop.id)
                ItinerarySyncManager.syncAsync(this)
                ItineraryWidgetProvider.refreshAll(this)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
