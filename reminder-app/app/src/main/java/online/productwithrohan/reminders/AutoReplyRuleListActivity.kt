package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton

/** Per-sender custom auto-reply messages, overriding the global message from [AutoReplySettings]. */
class AutoReplyRuleListActivity : AppCompatActivity() {

    private lateinit var adapter: SimpleListAdapter<AutoReplyRule>
    private lateinit var emptyView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_list_with_fab)
        title = getString(R.string.auto_reply_rules_title)

        emptyView = findViewById(R.id.empty_view)
        emptyView.text = getString(R.string.auto_reply_rules_empty)

        adapter = SimpleListAdapter(
            title = { it.senderName },
            subtitle = { it.message },
            onClick = { rule ->
                startActivity(
                    Intent(this, EditAutoReplyRuleActivity::class.java)
                        .putExtra(EditAutoReplyRuleActivity.EXTRA_RULE_ID, rule.id)
                )
            }
        )

        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, EditAutoReplyRuleActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        val rules = AutoReplyRuleStore.getAll(this).sortedBy { it.senderName.lowercase() }
        adapter.submit(rules)
        emptyView.visibility = if (rules.isEmpty()) View.VISIBLE else View.GONE
    }
}
