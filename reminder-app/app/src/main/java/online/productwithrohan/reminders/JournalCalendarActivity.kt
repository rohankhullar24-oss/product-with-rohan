package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.CalendarView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Jump to journal entries from a specific day via a calendar picker. */
class JournalCalendarActivity : AppCompatActivity() {

    private lateinit var adapter: JournalAdapter
    private lateinit var emptyView: TextView
    private var currentDate: LocalDate = LocalDate.now()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_journal_calendar)
        title = getString(R.string.journal_calendar_title)

        emptyView = findViewById(R.id.empty_view)
        adapter = JournalAdapter { entry ->
            startActivity(
                Intent(this, JournalEditActivity::class.java)
                    .putExtra(JournalEditActivity.EXTRA_ENTRY_ID, entry.id)
            )
        }
        findViewById<RecyclerView>(R.id.recycler).apply {
            layoutManager = LinearLayoutManager(this@JournalCalendarActivity)
            adapter = this@JournalCalendarActivity.adapter
        }

        findViewById<CalendarView>(R.id.calendar_view).setOnDateChangeListener { _, year, month, dayOfMonth ->
            showEntriesFor(LocalDate.of(year, month + 1, dayOfMonth))
        }
        showEntriesFor(currentDate)
    }

    override fun onResume() {
        super.onResume()
        // Re-pull in case an entry for this date was added/edited/deleted since this screen opened.
        showEntriesFor(currentDate)
    }

    private fun showEntriesFor(date: LocalDate) {
        currentDate = date
        val zone = ZoneId.systemDefault()
        val entries = JournalStore.getAll(this)
            .filter { Instant.ofEpochMilli(it.createdAt).atZone(zone).toLocalDate() == date }
            .sortedByDescending { it.updatedAt }
        adapter.submit(entries)
        emptyView.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
    }
}
