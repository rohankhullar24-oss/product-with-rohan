package online.productwithrohan.reminders

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.tabs.TabLayout

class AutoSchedulerActivity : AppCompatActivity() {

    private lateinit var adapter: AutoTaskAdapter
    private lateinit var emptyView: TextView
    private lateinit var permissionBanner: TextView
    private lateinit var tabs: TabLayout
    private val statusForTab = listOf(AutoTaskStatus.PENDING, AutoTaskStatus.DONE, AutoTaskStatus.FAILED)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auto_scheduler)
        title = getString(R.string.title_auto_scheduler)

        emptyView = findViewById(R.id.empty_view)
        permissionBanner = findViewById(R.id.permission_banner)
        permissionBanner.setOnClickListener {
            startActivity(
                Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                    .setData(Uri.parse("package:$packageName"))
            )
        }
        tabs = findViewById(R.id.tabs)

        adapter = AutoTaskAdapter(onClick = { task ->
            when (task.status) {
                AutoTaskStatus.FAILED -> promptRetry(task)
                AutoTaskStatus.PENDING -> promptPendingAction(task)
                AutoTaskStatus.DONE -> openEdit(task)
            }
        })

        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        tabs.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) = refresh()
            override fun onTabUnselected(tab: TabLayout.Tab) {}
            override fun onTabReselected(tab: TabLayout.Tab) {}
        })

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener { showTaskTypePicker() }
    }

    override fun onResume() {
        super.onResume()
        refresh()
        permissionBanner.visibility =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !AutoTaskAlarmScheduler.canScheduleExact(this))
                View.VISIBLE else View.GONE
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.auto_scheduler_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_recipient_lists -> {
            startActivity(Intent(this, RecipientListActivity::class.java))
            true
        }
        R.id.action_templates -> {
            startActivity(Intent(this, TemplateActivity::class.java))
            true
        }
        R.id.action_auto_scheduler_settings -> {
            startActivity(Intent(this, AutoSchedulerSettingsActivity::class.java))
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    private fun openEdit(task: AutoTask) {
        startActivity(
            Intent(this, EditAutoTaskActivity::class.java)
                .putExtra(EditAutoTaskActivity.EXTRA_TASK_ID, task.id)
        )
    }

    /** A failed task's own tap target: retry it right away, edit it, or leave it as-is. */
    private fun promptRetry(task: AutoTask) {
        AlertDialog.Builder(this)
            .setTitle(R.string.auto_retry_title)
            .setMessage(task.failureReason ?: getString(R.string.auto_task_status_failed))
            .setPositiveButton(R.string.auto_retry_yes) { _, _ -> retryNow(task) }
            .setNeutralButton(R.string.auto_retry_edit) { _, _ -> openEdit(task) }
            .setNegativeButton(R.string.auto_retry_no, null)
            .show()
    }

    /** Reschedules the task ~1 minute out and puts it back in Pending. */
    private fun retryNow(task: AutoTask) {
        task.status = AutoTaskStatus.PENDING
        task.failureReason = null
        task.scheduledAt = System.currentTimeMillis() + 60_000L
        task.updatedAt = System.currentTimeMillis()
        AutoTaskStore.upsert(this, task)
        AutoTaskAlarmScheduler.schedule(this, task)
        refresh()
        Toast.makeText(this, R.string.auto_retry_scheduled, Toast.LENGTH_SHORT).show()
    }

    /** A pending task's own tap target: edit it, snooze it a bit, or leave it as-is. */
    private fun promptPendingAction(task: AutoTask) {
        val options = arrayOf(
            getString(R.string.auto_pending_edit),
            getString(R.string.auto_pending_snooze_15),
            getString(R.string.auto_pending_snooze_60),
        )
        AlertDialog.Builder(this)
            .setTitle(task.displayTitle())
            .setItems(options) { _, index ->
                when (index) {
                    0 -> openEdit(task)
                    1 -> snooze(task, 15)
                    2 -> snooze(task, 60)
                }
            }
            .show()
    }

    private fun snooze(task: AutoTask, minutes: Int) {
        task.scheduledAt += minutes * 60_000L
        task.updatedAt = System.currentTimeMillis()
        AutoTaskStore.upsert(this, task)
        AutoTaskAlarmScheduler.schedule(this, task)
        refresh()
        Toast.makeText(this, getString(R.string.auto_snoozed, minutes), Toast.LENGTH_SHORT).show()
    }

    private fun refresh() {
        val status = statusForTab[tabs.selectedTabPosition]
        val tasks = AutoTaskStore.getAll(this)
            .filter { it.status == status }
            .sortedBy { it.scheduledAt }
        adapter.submit(tasks)
        emptyView.visibility = if (tasks.isEmpty()) View.VISIBLE else View.GONE
    }

    /** Matches the reference app's "Select a task" sheet: Schedule / Auto Reply / Auto Forward. */
    private fun showTaskTypePicker() {
        val options = arrayOf(
            getString(R.string.auto_task_type_schedule),
            getString(R.string.auto_task_type_reply),
            getString(R.string.auto_task_type_forward),
        )
        AlertDialog.Builder(this)
            .setTitle(R.string.auto_add_task)
            .setItems(options) { _, index ->
                when (index) {
                    0 -> showChannelPicker()
                    1 -> startActivity(Intent(this, AutoReplySettingsActivity::class.java))
                    2 -> startActivity(Intent(this, AutoForwardSettingsActivity::class.java))
                }
            }
            .show()
    }

    /** EMAIL isn't wired up yet (see AutoTaskAlarmReceiver). */
    private fun showChannelPicker() {
        val channels = AutoTaskChannel.entries.toList()
        val labels = channels.map { channel ->
            val name = channel.name.lowercase().replaceFirstChar { it.uppercase() }
            if (isSupported(channel)) name else getString(R.string.auto_channel_coming_soon, name)
        }.toTypedArray()

        AlertDialog.Builder(this)
            .setTitle(R.string.auto_pick_channel)
            .setItems(labels) { _, index ->
                val channel = channels[index]
                if (isSupported(channel)) {
                    startActivity(
                        Intent(this, EditAutoTaskActivity::class.java)
                            .putExtra(EditAutoTaskActivity.EXTRA_CHANNEL, channel.name)
                    )
                } else {
                    Toast.makeText(this, R.string.auto_channel_coming_soon_toast, Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    private fun isSupported(channel: AutoTaskChannel): Boolean =
        channel == AutoTaskChannel.SMS || channel == AutoTaskChannel.CALL ||
            channel == AutoTaskChannel.REMINDER || channel == AutoTaskChannel.WHATSAPP ||
            channel == AutoTaskChannel.TELEGRAM || channel == AutoTaskChannel.FAKE_CALL
}
