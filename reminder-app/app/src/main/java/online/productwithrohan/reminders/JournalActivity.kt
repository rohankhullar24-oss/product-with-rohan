package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton

/**
 * Journal is only reachable from the MainActivity ⋮ menu, and re-gated behind
 * the device's biometric or lock-screen credential every time it's opened —
 * entries are personal thoughts, unlike the reminders list which needs no
 * such gate. Nothing is loaded into the list until that check succeeds.
 */
class JournalActivity : AppCompatActivity() {

    private lateinit var adapter: JournalAdapter
    private lateinit var emptyView: TextView
    private var authenticated = false

    private val authenticators =
        BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_journal)
        title = getString(R.string.title_journal)

        emptyView = findViewById(R.id.empty_view)
        adapter = JournalAdapter { entry ->
            startActivity(
                Intent(this, JournalEditActivity::class.java)
                    .putExtra(JournalEditActivity.EXTRA_ENTRY_ID, entry.id)
            )
        }
        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)
        recycler.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fab).setOnClickListener {
            startActivity(Intent(this, JournalEditActivity::class.java))
        }

        authenticate()
    }

    override fun onResume() {
        super.onResume()
        if (authenticated) {
            refresh()
            JournalSyncManager.syncAsync(this) { changed ->
                if (changed) runOnUiThread { refresh() }
            }
        }
    }

    private fun authenticate() {
        when (BiometricManager.from(this).canAuthenticate(authenticators)) {
            BiometricManager.BIOMETRIC_SUCCESS -> promptAuth()
            else -> {
                Toast.makeText(this, R.string.journal_no_lock_set, Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }

    private fun promptAuth() {
        val prompt = BiometricPrompt(
            this,
            ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    authenticated = true
                    refresh()
                    JournalSyncManager.syncAsync(this@JournalActivity) { changed ->
                        if (changed) runOnUiThread { refresh() }
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    // Cancelled, too many attempts, etc. — bail back to the reminders list.
                    finish()
                }

                override fun onAuthenticationFailed() {
                    // Wrong fingerprint/face — the prompt itself lets the user retry.
                }
            }
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(getString(R.string.journal_unlock_title))
            .setAllowedAuthenticators(authenticators)
            .build()
        prompt.authenticate(info)
    }

    private fun refresh() {
        val entries = JournalStore.getAll(this).sortedByDescending { it.updatedAt }
        adapter.submit(entries)
        emptyView.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
    }
}
