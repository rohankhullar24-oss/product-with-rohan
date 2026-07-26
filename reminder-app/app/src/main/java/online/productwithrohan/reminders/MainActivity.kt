package online.productwithrohan.reminders

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton

class MainActivity : AppCompatActivity() {

    private lateinit var adapter: ReminderAdapter
    private lateinit var emptyView: TextView
    private lateinit var permissionBanner: TextView

    private val exportLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
            if (uri == null) return@registerForActivityResult
            try {
                contentResolver.openOutputStream(uri)?.use { out ->
                    out.write(ReminderStore.exportJson(this).toByteArray())
                }
                Toast.makeText(this, R.string.export_done, Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, R.string.export_failed, Toast.LENGTH_SHORT).show()
            }
        }

    private val importLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri == null) return@registerForActivityResult
            try {
                val text = contentResolver.openInputStream(uri)?.use { input ->
                    input.readBytes().decodeToString()
                } ?: throw IllegalStateException("empty file")
                for (old in ReminderStore.getAll(this)) {
                    AlarmScheduler.cancelAll(this, old.id)
                    NotificationHelper.cancel(this, old.id)
                }
                val imported = ReminderStore.importJson(this, text)
                for (r in imported) {
                    if (r.enabled && !r.completed) AlarmScheduler.scheduleNext(this, r)
                }
                refresh()
                Toast.makeText(this, getString(R.string.import_done, imported.size), Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, R.string.import_failed, Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        NotificationHelper.ensureChannel(this)

        emptyView = findViewById(R.id.empty_view)
        permissionBanner = findViewById(R.id.permission_banner)

        adapter = ReminderAdapter(
            onClick = { reminder ->
                startActivity(
                    Intent(this, EditReminderActivity::class.java)
                        .putExtra(EditReminderActivity.EXTRA_REMINDER_ID, reminder.id)
                )
            },
            onToggle = { reminder, enabled ->
                reminder.enabled = enabled
                reminder.updatedAt = System.currentTimeMillis()
                if (!enabled) {
                    reminder.activeNagDay = null
                    AlarmScheduler.cancelAll(this, reminder.id)
                    NotificationHelper.cancel(this, reminder.id)
                    ReminderStore.upsert(this, reminder)
                } else {
                    ReminderStore.upsert(this, reminder)
                    AlarmScheduler.scheduleNext(this, reminder)
                }
                refresh()
                SyncManager.syncAsync(this)
            }
        )

        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, EditReminderActivity::class.java))
        }

        permissionBanner.setOnClickListener { fixPermissions() }

        requestNotificationPermissionIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        refresh()
        updatePermissionBanner()
        SyncManager.syncAsync(this) { changed ->
            if (changed) runOnUiThread { refresh() }
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_account -> {
            startActivity(Intent(this, AccountActivity::class.java))
            true
        }
        R.id.action_export -> {
            exportLauncher.launch("reminders-backup.json")
            true
        }
        R.id.action_import -> {
            importLauncher.launch(arrayOf("*/*"))
            true
        }
        else -> super.onOptionsItemSelected(item)
    }

    private fun refresh() {
        val reminders = ReminderStore.getAll(this)
            .sortedWith(compareBy({ it.completed }, { it.nextTrigger()?.toInstant()?.toEpochMilli() ?: Long.MAX_VALUE }))
        adapter.submit(reminders)
        emptyView.visibility = if (reminders.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1
            )
        }
    }

    private fun updatePermissionBanner() {
        val missingNotifications = Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        val missingExact = !AlarmScheduler.canScheduleExact(this)
        permissionBanner.visibility =
            if (missingNotifications || missingExact) View.VISIBLE else View.GONE
        permissionBanner.text = when {
            missingNotifications -> getString(R.string.banner_notifications)
            else -> getString(R.string.banner_exact_alarms)
        }
    }

    private fun fixPermissions() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            startActivity(
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !AlarmScheduler.canScheduleExact(this)) {
            startActivity(
                Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                    .setData(Uri.parse("package:$packageName"))
            )
        }
    }
}
