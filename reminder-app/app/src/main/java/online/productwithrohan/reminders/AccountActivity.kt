package online.productwithrohan.reminders

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.text.DateFormat
import java.util.Date

/**
 * One screen, two states: signed out (email → code → verify) and signed in
 * (account info, manual sync, sign out). Network calls run on worker threads.
 */
class AccountActivity : AppCompatActivity() {

    private lateinit var signedOutGroup: View
    private lateinit var signedInGroup: View
    private lateinit var emailInput: EditText
    private lateinit var codeRow: View
    private lateinit var codeInput: EditText
    private lateinit var statusText: TextView
    private lateinit var accountEmail: TextView
    private lateinit var lastSync: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_account)
        title = getString(R.string.title_account)

        signedOutGroup = findViewById(R.id.group_signed_out)
        signedInGroup = findViewById(R.id.group_signed_in)
        emailInput = findViewById(R.id.input_email)
        codeRow = findViewById(R.id.row_code)
        codeInput = findViewById(R.id.input_code)
        statusText = findViewById(R.id.text_status)
        accountEmail = findViewById(R.id.text_account_email)
        lastSync = findViewById(R.id.text_last_sync)

        findViewById<Button>(R.id.button_send_code).setOnClickListener { sendCode() }
        findViewById<Button>(R.id.button_verify).setOnClickListener { verifyCode() }
        findViewById<Button>(R.id.button_sync_now).setOnClickListener { syncNow() }
        findViewById<Button>(R.id.button_sign_out).setOnClickListener { signOut() }

        render()
    }

    private fun render() {
        val signedIn = SupabaseClient.isSignedIn(this)
        signedOutGroup.visibility = if (signedIn) View.GONE else View.VISIBLE
        signedInGroup.visibility = if (signedIn) View.VISIBLE else View.GONE
        if (signedIn) {
            accountEmail.text = getString(
                R.string.account_signed_in_as, SupabaseClient.userEmail(this) ?: ""
            )
            val at = SupabaseClient.lastSyncAt(this)
            lastSync.text = if (at > 0) {
                getString(
                    R.string.account_last_sync,
                    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(at))
                )
            } else {
                getString(R.string.account_never_synced)
            }
        }
    }

    private fun sendCode() {
        val email = emailInput.text.toString().trim()
        if (!email.contains("@") || email.length < 5) {
            Toast.makeText(this, R.string.account_bad_email, Toast.LENGTH_SHORT).show()
            return
        }
        statusText.text = getString(R.string.account_sending)
        Thread {
            try {
                SupabaseClient.requestOtp(email)
                runOnUiThread {
                    codeRow.visibility = View.VISIBLE
                    statusText.text = getString(R.string.account_code_sent, email)
                }
            } catch (e: Exception) {
                runOnUiThread { statusText.text = getString(R.string.account_send_failed) }
            }
        }.start()
    }

    private fun verifyCode() {
        val email = emailInput.text.toString().trim()
        val code = codeInput.text.toString().trim()
        if (code.isEmpty()) return
        statusText.text = getString(R.string.account_verifying)
        Thread {
            try {
                SupabaseClient.verifyOtp(this, email, code)
                SyncManager.syncAsync(this) {
                    runOnUiThread {
                        Toast.makeText(this, R.string.account_signed_in, Toast.LENGTH_SHORT).show()
                        statusText.text = ""
                        render()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { statusText.text = getString(R.string.account_verify_failed) }
            }
        }.start()
    }

    private fun syncNow() {
        lastSync.text = getString(R.string.account_syncing)
        SyncManager.syncAsync(this) {
            runOnUiThread { render() }
        }
    }

    private fun signOut() {
        SupabaseClient.signOut(this)
        Toast.makeText(this, R.string.account_signed_out, Toast.LENGTH_SHORT).show()
        render()
    }
}
