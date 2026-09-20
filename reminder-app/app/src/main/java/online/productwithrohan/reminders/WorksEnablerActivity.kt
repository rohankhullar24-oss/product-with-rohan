package online.productwithrohan.reminders

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity

/**
 * Hub for the open-source document tools ("Works Enabler"). Routes into the
 * per-format screens; each of those handles its own open-existing/create-new
 * choice rather than the hub doing it.
 */
class WorksEnablerActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_works_enabler)
        title = getString(R.string.title_works_enabler)

        findViewById<View>(R.id.card_pdf).setOnClickListener {
            startActivity(Intent(this, PdfToolsActivity::class.java))
        }
        findViewById<View>(R.id.card_ocr).setOnClickListener {
            startActivity(Intent(this, OcrScanActivity::class.java))
        }
        findViewById<View>(R.id.card_spreadsheet).setOnClickListener {
            startActivity(Intent(this, SpreadsheetActivity::class.java))
        }
        findViewById<View>(R.id.card_word).setOnClickListener {
            startActivity(Intent(this, DocxEditorActivity::class.java))
        }
        findViewById<View>(R.id.card_powerpoint).setOnClickListener {
            startActivity(Intent(this, PptxEditorActivity::class.java))
        }
    }
}
