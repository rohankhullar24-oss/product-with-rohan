package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton

class RecipientListActivity : AppCompatActivity() {

    private lateinit var adapter: SimpleListAdapter<RecipientList>
    private lateinit var emptyView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_list_with_fab)
        title = getString(R.string.title_recipient_lists)

        emptyView = findViewById(R.id.empty_view)
        emptyView.text = getString(R.string.recipient_list_empty)

        adapter = SimpleListAdapter(
            title = { it.name },
            subtitle = { getString(R.string.recipient_list_member_count, it.members.size) },
            onClick = { list ->
                startActivity(
                    Intent(this, EditRecipientListActivity::class.java)
                        .putExtra(EditRecipientListActivity.EXTRA_LIST_ID, list.id)
                )
            }
        )

        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, EditRecipientListActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        val lists = RecipientListStore.getAll(this).sortedBy { it.name.lowercase() }
        adapter.submit(lists)
        emptyView.visibility = if (lists.isEmpty()) View.VISIBLE else View.GONE
    }
}
