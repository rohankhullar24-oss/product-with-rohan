package online.productwithrohan.reminders

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.TextView
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
