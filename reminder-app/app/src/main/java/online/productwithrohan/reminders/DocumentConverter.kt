package online.productwithrohan.reminders

import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.font.PDType1Font
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File

/**
 * Phase 4: PDF <-> Word conversion, both directions plain-text only — no
 * attempt to preserve original layout, tables, or images, matching
 * DocxEngine's own paragraph-only scope. `PDType1Font.getStringWidth` and
 * `encode` (used internally by `showText`) throw `IllegalArgumentException`
 * for characters the standard 14 fonts' WinAnsiEncoding doesn't support, so
 * text is sanitized to that range before drawing rather than letting an
 * unusual character abort the whole conversion.
 */
object DocumentConverter {

    private const val MARGIN = 50f
    private const val FONT_SIZE = 11f
    private const val LEADING = 14f

    fun pdfToDocx(pdfFile: File): DocxEngine.Document {
        val text = PDDocument.load(pdfFile).use { doc -> PDFTextStripper().getText(doc) }
        return DocxEngine.fromPlainText(text.trimEnd('\n'))
    }

    fun docxToPdf(document: DocxEngine.Document, outFile: File) {
        val pdf = PDDocument()
        try {
            val pageSize = PDRectangle.LETTER
            val usableWidth = pageSize.width - 2 * MARGIN
            var page = PDPage(pageSize)
            pdf.addPage(page)
            var contentStream = PDPageContentStream(pdf, page)
            var cursorY = pageSize.height - MARGIN
            contentStream.beginText()
            contentStream.setLeading(LEADING.toDouble())
            contentStream.newLineAtOffset(MARGIN, cursorY)

            fun startNewPage() {
                contentStream.endText()
                contentStream.close()
                page = PDPage(pageSize)
                pdf.addPage(page)
                contentStream = PDPageContentStream(pdf, page)
                cursorY = pageSize.height - MARGIN
                contentStream.beginText()
                contentStream.setLeading(LEADING.toDouble())
                contentStream.newLineAtOffset(MARGIN, cursorY)
            }

            for (paragraph in document.paragraphs) {
                val font = fontFor(paragraph.bold, paragraph.italic)
                contentStream.setFont(font, FONT_SIZE)
                val sanitized = sanitize(paragraph.text)
                val lines = if (sanitized.isEmpty()) listOf("") else wrapText(sanitized, font, FONT_SIZE, usableWidth)
                for (line in lines) {
                    if (cursorY <= MARGIN) {
                        startNewPage()
                        contentStream.setFont(font, FONT_SIZE)
                    }
                    try {
                        contentStream.showText(line)
                    } catch (e: IllegalArgumentException) {
                        contentStream.showText(line.map { if (it.code in 32..126) it else '?' }.joinToString(""))
                    }
                    contentStream.newLine()
                    cursorY -= LEADING
                }
            }
            contentStream.endText()
            contentStream.close()
            pdf.save(outFile)
        } finally {
            pdf.close()
        }
    }

    /** Standard-14 fonts only support WinAnsiEncoding (~Latin-1); anything else becomes '?'. */
    private fun sanitize(text: String): String =
        text.map { ch -> if (ch.code in 32..255) ch else '?' }.joinToString("")

    private fun fontFor(bold: Boolean, italic: Boolean): PDType1Font = when {
        bold && italic -> PDType1Font.HELVETICA_BOLD_OBLIQUE
        bold -> PDType1Font.HELVETICA_BOLD
        italic -> PDType1Font.HELVETICA_OBLIQUE
        else -> PDType1Font.HELVETICA
    }

    private fun wrapText(text: String, font: PDType1Font, fontSize: Float, maxWidth: Float): List<String> {
        val words = text.split(" ")
        val lines = ArrayList<String>()
        var current = StringBuilder()
        for (word in words) {
            val candidate = if (current.isEmpty()) word else "$current $word"
            val width = font.getStringWidth(candidate) / 1000f * fontSize
            if (width > maxWidth && current.isNotEmpty()) {
                lines.add(current.toString())
                current = StringBuilder(word)
            } else {
                current = StringBuilder(candidate)
            }
        }
        if (current.isNotEmpty()) lines.add(current.toString())
        return lines
    }
}
