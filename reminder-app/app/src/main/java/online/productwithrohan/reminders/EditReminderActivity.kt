package online.productwithrohan.reminders

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class EditReminderActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_REMINDER_ID = "reminder_id"
        private val NAG_MINUTES = listOf(0, 10, 15, 30, 60, 120)
        private const val MAX_TIMES_PER_DAY = 10
    }

    private lateinit var reminder: Reminder
    private var isNew = true

    private lateinit var titleInput: EditText
    private lateinit var notesInput: EditText
    private lateinit var typeSpinner: Spinner
    private lateinit var dateButton: Button
    private lateinit var dateRow: View
    private lateinit var weeklyRow: View
    private lateinit var monthlyRow: View
    private lateinit var dayOfMonthSpinner: Spinner
    private lateinit var timesContainer: LinearLayout
    private lateinit var nagSpinner: Spinner
    private val weekChecks = mutableListOf<CheckBox>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit)

        val existingId = intent.getStringExtra(EXTRA_REMINDER_ID)
        val existing = existingId?.let { ReminderStore.get(this, it) }
        isNew = existing == null
        reminder = existing ?: Reminder(timesOfDay = mutableListOf("09:00"))
        title = getString(if (isNew) R.string.title_new_reminder else R.string.title_edit_reminder)

        titleInput = findViewById(R.id.input_title)
        notesInput = findViewById(R.id.input_notes)
        typeSpinner = findViewById(R.id.spinner_type)
        dateButton = findViewById(R.id.button_date)
        dateRow = findViewById(R.id.row_date)
        weeklyRow = findViewById(R.id.row_weekly)
        monthlyRow = findViewById(R.id.row_monthly)
        dayOfMonthSpinner = findViewById(R.id.spinner_day_of_month)
        timesContainer = findViewById(R.id.times_container)
        nagSpinner = findViewById(R.id.spinner_nag)

        titleInput.setText(reminder.title)
        notesInput.setText(reminder.notes)

        setUpTypeSpinner()
        setUpWeekChecks()
        setUpDayOfMonthSpinner()
        setUpNagSpinner()
        renderTimes()

        dateButton.setOnClickListener { pickDate() }
        findViewById<Button>(R.id.button_add_time).setOnClickListener { addTime() }
        findViewById<Button>(R.id.button_save).setOnClickListener { save() }

        val deleteButton = findViewById<Button>(R.id.button_delete)
        deleteButton.visibility = if (isNew) View.GONE else View.VISIBLE
        deleteButton.setOnClickListener { confirmDelete() }
    }

    private fun setUpTypeSpinner() {
        val labels = resources.getStringArray(R.array.reminder_types)
        typeSpinner.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item, labels
        )
        typeSpinner.setSelection(reminder.type.ordinal)
        typeSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                reminder.type = ReminderType.values()[pos]
                updateVisibility()
            }

            override fun onNothingSelected(p: AdapterView<*>?) {}
        }
        updateVisibility()
    }

    private fun updateVisibility() {
        dateRow.visibility = when (reminder.type) {
            ReminderType.ONE_TIME, ReminderType.YEARLY -> View.VISIBLE
            else -> View.GONE
        }
        weeklyRow.visibility =
            if (reminder.type == ReminderType.WEEKLY) View.VISIBLE else View.GONE
        monthlyRow.visibility =
            if (reminder.type == ReminderType.MONTHLY) View.VISIBLE else View.GONE
        updateDateLabel()
    }

    private fun updateDateLabel() {
        dateButton.text = when (reminder.type) {
            ReminderType.ONE_TIME -> reminder.oneTimeDate?.let {
                LocalDate.parse(it).format(DateTimeFormatter.ofPattern("d MMM yyyy"))
            } ?: getString(R.string.pick_date)
            ReminderType.YEARLY ->
                if (reminder.month in 1..12 && reminder.day in 1..31) {
                    String.format(
                        Locale.getDefault(), "%d %s", reminder.day,
                        java.time.Month.of(reminder.month)
                            .getDisplayName(java.time.format.TextStyle.SHORT, Locale.getDefault())
                    )
                } else getString(R.string.pick_date)
            else -> getString(R.string.pick_date)
        }
    }

    private fun pickDate() {
        val today = LocalDate.now()
        val initial = when (reminder.type) {
            ReminderType.ONE_TIME -> reminder.oneTimeDate?.let { LocalDate.parse(it) } ?: today
            else -> {
                val safeDay = minOf(reminder.day, LocalDate.of(today.year, reminder.month, 1).lengthOfMonth())
                LocalDate.of(today.year, reminder.month, safeDay)
            }
        }
        DatePickerDialog(
            this,
            { _, year, monthZeroBased, dayOfMonth ->
                if (reminder.type == ReminderType.ONE_TIME) {
                    reminder.oneTimeDate = LocalDate.of(year, monthZeroBased + 1, dayOfMonth).toString()
                } else {
                    reminder.month = monthZeroBased + 1
                    reminder.day = dayOfMonth
                }
                updateDateLabel()
            },
            initial.year, initial.monthValue - 1, initial.dayOfMonth
        ).show()
    }

    private fun setUpWeekChecks() {
        val row = findViewById<LinearLayout>(R.id.week_checks)
        val names = resources.getStringArray(R.array.week_days)
        weekChecks.clear()
        row.removeAllViews()
        for (i in 1..7) {
            val cb = CheckBox(this)
            cb.text = names[i - 1]
            cb.isChecked = reminder.daysOfWeek.contains(i)
            cb.setOnCheckedChangeListener { _, checked ->
                if (checked) reminder.daysOfWeek.add(i) else reminder.daysOfWeek.remove(i)
            }
            row.addView(cb)
            weekChecks.add(cb)
        }
    }

    private fun setUpDayOfMonthSpinner() {
        val days = (1..31).map { it.toString() }
        dayOfMonthSpinner.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item, days
        )
        dayOfMonthSpinner.setSelection(reminder.dayOfMonth - 1)
        dayOfMonthSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                reminder.dayOfMonth = pos + 1
            }

            override fun onNothingSelected(p: AdapterView<*>?) {}
        }
    }

    private fun setUpNagSpinner() {
        val labels = resources.getStringArray(R.array.nag_intervals)
        nagSpinner.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item, labels
        )
        val idx = NAG_MINUTES.indexOf(reminder.nagIntervalMinutes)
        nagSpinner.setSelection(if (idx >= 0) idx else NAG_MINUTES.indexOf(30))
        nagSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                reminder.nagIntervalMinutes = NAG_MINUTES[pos]
            }

            override fun onNothingSelected(p: AdapterView<*>?) {}
        }
    }

    private fun renderTimes() {
        timesContainer.removeAllViews()
        for (time in reminder.timesOfDay.sorted()) {
            val row = LayoutInflater.from(this)
                .inflate(R.layout.item_time, timesContainer, false)
            row.findViewById<TextView>(R.id.time_text).text = time
            row.findViewById<ImageButton>(R.id.time_remove).setOnClickListener {
                reminder.timesOfDay.remove(time)
                renderTimes()
            }
            timesContainer.addView(row)
        }
    }

    private fun addTime() {
        if (reminder.timesOfDay.size >= MAX_TIMES_PER_DAY) {
            Toast.makeText(this, getString(R.string.error_max_times, MAX_TIMES_PER_DAY), Toast.LENGTH_SHORT).show()
            return
        }
        TimePickerDialog(
            this,
            { _, hour, minute ->
                val value = String.format(Locale.US, "%02d:%02d", hour, minute)
                if (!reminder.timesOfDay.contains(value)) {
                    reminder.timesOfDay.add(value)
                    renderTimes()
                }
            },
            9, 0, true
        ).show()
    }

    private fun save() {
        reminder.title = titleInput.text.toString().trim()
        reminder.notes = notesInput.text.toString().trim()

        if (reminder.title.isEmpty()) {
            Toast.makeText(this, R.string.error_title_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (reminder.timesOfDay.isEmpty()) {
            Toast.makeText(this, R.string.error_time_required, Toast.LENGTH_SHORT).show()
            return
        }
        when (reminder.type) {
            ReminderType.ONE_TIME -> if (reminder.oneTimeDate == null) {
                Toast.makeText(this, R.string.error_date_required, Toast.LENGTH_SHORT).show()
                return
            }
            ReminderType.WEEKLY -> if (reminder.daysOfWeek.isEmpty()) {
                Toast.makeText(this, R.string.error_weekday_required, Toast.LENGTH_SHORT).show()
                return
            }
            else -> {}
        }

        // Editing resurrects a finished/acknowledged reminder for its next run.
        reminder.completed = false
        reminder.doneForDay = null
        reminder.activeNagDay = null
        reminder.enabled = true

        if (reminder.nextTrigger() == null) {
            Toast.makeText(this, R.string.error_past_time, Toast.LENGTH_LONG).show()
            return
        }

        reminder.updatedAt = System.currentTimeMillis()
        ReminderStore.upsert(this, reminder)
        AlarmScheduler.cancelNag(this, reminder.id)
        NotificationHelper.cancel(this, reminder.id)
        AlarmScheduler.scheduleNext(this, reminder)
        SyncManager.syncAsync(this)
        finish()
    }

    private fun confirmDelete() {
        AlertDialog.Builder(this)
            .setTitle(R.string.delete_title)
            .setMessage(R.string.delete_message)
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                AlarmScheduler.cancelAll(this, reminder.id)
                NotificationHelper.cancel(this, reminder.id)
                ReminderStore.delete(this, reminder.id)
                SyncManager.recordDeletion(this, reminder.id)
                SyncManager.syncAsync(this)
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
}
