package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.StaggeredGridLayoutManager
import com.google.android.material.floatingactionbutton.FloatingActionButton

/**
 * Notes list: a Google-Keep-style staggered grid of note cards, Pinned
 * section first. Reachable from the MainActivity ⋮ menu, alongside Journal
 * and Itinerary Planner. Notes sync via [NotesSyncManager] to the same
 * signed-in Supabase account reminders/journal/itinerary already use.
 */
class NotesActivity : AppCompatActivity() {

    private lateinit var adapter: NoteAdapter
    private lateinit var emptyView: TextView
    private var showArchived = false
    private var query: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notes)
        title = getString(R.string.title_notes)

        emptyView = findViewById(R.id.empty_view)
        adapter = NoteAdapter { note ->
            startActivity(
                Intent(this, NoteEditActivity::class.java)
                    .putExtra(NoteEditActivity.EXTRA_NOTE_ID, note.id)
            )
        }
        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = StaggeredGridLayoutManager(2, StaggeredGridLayoutManager.VERTICAL)
        recycler.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, NoteEditActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        refresh()
        NotesSyncManager.syncAsync(this) { changed ->
            if (changed) runOnUiThread { refresh() }
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.notes_menu, menu)
        val searchItem = menu.findItem(R.id.action_search_notes)
        (searchItem.actionView as SearchView).apply {
            queryHint = getString(R.string.notes_search_hint)
            setOnQueryTextListener(object : SearchView.OnQueryTextListener {
                override fun onQueryTextSubmit(text: String?): Boolean = false
                override fun onQueryTextChange(text: String?): Boolean {
                    query = text.orEmpty()
                    refresh()
                    return true
                }
            })
        }
        menu.findItem(R.id.action_show_archived).isChecked = showArchived
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_show_archived -> {
            showArchived = !showArchived
            item.isChecked = showArchived
            title = getString(if (showArchived) R.string.title_notes_archive else R.string.title_notes)
            refresh()
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    private fun refresh() {
        var notes = NoteStore.getAll(this).filter { it.archived == showArchived }
        if (query.isNotBlank()) {
            val q = query.trim()
            notes = notes.filter { note ->
                note.title.contains(q, ignoreCase = true) ||
                    note.body.contains(q, ignoreCase = true) ||
                    note.checklist.any { it.text.contains(q, ignoreCase = true) }
            }
        }
        notes = notes.sortedByDescending { it.updatedAt }
        adapter.submit(notes)
        emptyView.visibility = if (notes.isEmpty()) View.VISIBLE else View.GONE
        emptyView.text = getString(
            when {
                query.isNotBlank() -> R.string.notes_empty_search
                showArchived -> R.string.notes_empty_archive
                else -> R.string.notes_empty
            }
        )
    }
}
