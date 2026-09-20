package online.productwithrohan.reminders

import android.util.Xml
import org.xmlpull.v1.XmlPullParser
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

/**
 * Hand-rolled minimal DOCX reader/writer. Scope is deliberately narrow: plain
 * paragraphs of text with a whole-paragraph bold/italic flag — no per-run
 * (character-level) formatting, tables, or inline images in this v1. A real
 * docx can carry multiple differently-styled runs per paragraph; on load
 * those runs are concatenated into one string and bold/italic are set true
 * if *any* run in the paragraph had them, so round-tripping a document this
 * engine didn't create loses per-run styling — acceptable for a v1 editor,
 * not for archival fidelity.
 *
 * Uses java.util.zip (see XlsxEngine for why, over zip4j) and a
 * namespace-unaware XmlPullParser, matching raw tag names as Word/LibreOffice
 * emit them (e.g. "w:p", "w:t").
 */
object DocxEngine {

    class Paragraph(var text: String, var bold: Boolean = false, var italic: Boolean = false)
    class Document(val paragraphs: MutableList<Paragraph>)

    fun createBlank(): Document = Document(mutableListOf(Paragraph("")))

    fun load(file: File): Document {
        ZipFile(file).use { zip ->
            val entry = zip.getEntry("word/document.xml")
                ?: throw IllegalStateException("not a Word document (missing word/document.xml)")
            val paragraphs = zip.getInputStream(entry).use { readParagraphs(it) }
            return Document(if (paragraphs.isEmpty()) mutableListOf(Paragraph("")) else paragraphs)
        }
    }

    fun save(document: Document, file: File) {
        FileOutputStream(file).use { fos ->
            ZipOutputStream(fos).use { zos ->
                writeEntry(zos, "[Content_Types].xml", contentTypesXml())
                writeEntry(zos, "_rels/.rels", XlsxEngine.rootRelsXml("word/document.xml"))
                writeEntry(zos, "word/document.xml", documentXml(document))
            }
        }
    }

    /** Plain-text extraction for Phase 4's PDF -> Word conversion input, reused here for consistency. */
    fun fromPlainText(text: String): Document {
        val paragraphs = text.split("\n").map { Paragraph(it) }.toMutableList()
        if (paragraphs.isEmpty()) paragraphs.add(Paragraph(""))
        return Document(paragraphs)
    }

    private fun writeEntry(zos: ZipOutputStream, name: String, content: String) {
        zos.putNextEntry(ZipEntry(name))
        zos.write(content.toByteArray(Charsets.UTF_8))
        zos.closeEntry()
    }

    // ---- reading ----

    private fun readParagraphs(input: java.io.InputStream): MutableList<Paragraph> {
        val paragraphs = ArrayList<Paragraph>()
        val parser = Xml.newPullParser()
        parser.setInput(input, "UTF-8")
        var event = parser.eventType

        var inBody = false
        var currentText: StringBuilder? = null
        var currentBold = false
        var currentItalic = false
        var inText = false
        var runBold = false
        var runItalic = false

        while (event != XmlPullParser.END_DOCUMENT) {
            when (event) {
                XmlPullParser.START_TAG -> when (parser.name) {
                    "w:body" -> inBody = true
                    "w:p" -> if (inBody) {
                        currentText = StringBuilder()
                        currentBold = false
                        currentItalic = false
                    }
                    "w:r" -> {
                        runBold = false
                        runItalic = false
                    }
                    "w:b" -> runBold = true
                    "w:i" -> runItalic = true
                    "w:t" -> inText = true
                }
                XmlPullParser.TEXT -> if (inText) currentText?.append(parser.text)
                XmlPullParser.END_TAG -> when (parser.name) {
                    "w:t" -> inText = false
                    "w:r" -> {
                        if (runBold) currentBold = true
                        if (runItalic) currentItalic = true
                    }
                    "w:p" -> if (inBody) {
                        currentText?.let { paragraphs.add(Paragraph(it.toString(), currentBold, currentItalic)) }
                        currentText = null
                    }
                    "w:body" -> inBody = false
                }
            }
            event = parser.next()
        }
        return paragraphs
    }

    // ---- writing ----

    private fun escapeXml(s: String): String = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    private fun documentXml(document: Document): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>")
        document.paragraphs.forEach { paragraph ->
            sb.append("<w:p>")
            if (paragraph.bold || paragraph.italic) {
                sb.append("<w:pPr><w:rPr>")
                if (paragraph.bold) sb.append("<w:b/>")
                if (paragraph.italic) sb.append("<w:i/>")
                sb.append("</w:rPr></w:pPr>")
            }
            sb.append("<w:r>")
            if (paragraph.bold || paragraph.italic) {
                sb.append("<w:rPr>")
                if (paragraph.bold) sb.append("<w:b/>")
                if (paragraph.italic) sb.append("<w:i/>")
                sb.append("</w:rPr>")
            }
            sb.append("<w:t xml:space=\"preserve\">${escapeXml(paragraph.text)}</w:t>")
            sb.append("</w:r></w:p>")
        }
        sb.append("<w:sectPr/></w:body></w:document>")
        return sb.toString()
    }

    private fun contentTypesXml(): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
            "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
            "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
            "<Override PartName=\"/word/document.xml\" " +
            "ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
            "</Types>"
}
