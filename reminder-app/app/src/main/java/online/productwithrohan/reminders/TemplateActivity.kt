package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton

class TemplateActivity : AppCompatActivity() {

    private lateinit var adapter: SimpleListAdapter<Template>
    private lateinit var emptyView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_list_with_fab)
        title = getString(R.string.title_templates)

        emptyView = findViewById(R.id.empty_view)
        emptyView.text = getString(R.string.template_empty_list)

        adapter = SimpleListAdapter(
            title = { it.name },
            subtitle = { it.message },
            onClick = { template ->
                startActivity(
                    Intent(this, EditTemplateActivity::class.java)
                        .putExtra(EditTemplateActivity.EXTRA_TEMPLATE_ID, template.id)
                )
            }
        )

        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, EditTemplateActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        val templates = TemplateStore.getAll(this).sortedBy { it.name.lowercase() }
        adapter.submit(templates)
        emptyView.visibility = if (templates.isEmpty()) View.VISIBLE else View.GONE
    }
}
