package online.productwithrohan.reminders

import android.util.Xml
import org.xmlpull.v1.XmlPullParser
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

/**
 * Hand-rolled minimal XLSX reader/writer: cell text/number values and sheet
 * names only — no formulas, charts, or per-cell styling. XLSX is a zip of XML
 * parts; this reads/writes just enough of them (workbook.xml, its rels,
 * worksheets/sheetN.xml, sharedStrings.xml) to round-trip a plain data grid.
 *
 * Uses java.util.zip (built into the JDK) rather than zip4j — these files are
 * never password-protected, so zip4j's extra capability isn't needed, and a
 * stdlib API needs no upstream-source verification the way a new dependency
 * would.
 *
 * The parser is deliberately namespace-unaware (Android's default for
 * `Xml.newPullParser()`), so tag/attribute names are matched as the raw
 * strings real spreadsheet tools emit, prefix included (e.g. "r:id").
 */
object XlsxEngine {

    const val MAX_ROWS = 100
    const val MAX_COLS = 20
    private const val DEFAULT_ROWS = 20
    private const val DEFAULT_COLS = 8

    class Sheet(var name: String, val rows: MutableList<MutableList<String>>)
    class Workbook(val sheets: MutableList<Sheet>)

    fun createBlank(): Workbook {
        val rows = MutableList(DEFAULT_ROWS) { MutableList(DEFAULT_COLS) { "" } }
        return Workbook(mutableListOf(Sheet("Sheet1", rows)))
    }

    /** Row/column letter helper for the UI, e.g. column 0 -> "A", 26 -> "AA". */
    fun columnName(col: Int): String {
        var n = col + 1
        val sb = StringBuilder()
        while (n > 0) {
            val rem = (n - 1) % 26
            sb.insert(0, ('A' + rem))
            n = (n - 1) / 26
        }
        return sb.toString()
    }

    fun load(file: File): Workbook {
        ZipFile(file).use { zip ->
            val sharedStrings = readSharedStrings(zip)
            val sheetTargets = readWorkbookSheets(zip)
            val sheets = sheetTargets.map { (name, target) ->
                val normalized = if (target.startsWith("/")) target.removePrefix("/") else "xl/$target"
                val entry = zip.getEntry(normalized) ?: zip.getEntry(target)
                val rows = if (entry != null) {
                    zip.getInputStream(entry).use { readSheet(it, sharedStrings) }
                } else {
                    mutableListOf()
                }
                Sheet(name, rows)
            }.toMutableList()
            if (sheets.isEmpty()) sheets.add(Sheet("Sheet1", mutableListOf()))
            return Workbook(sheets)
        }
    }

    fun save(workbook: Workbook, file: File) {
        FileOutputStream(file).use { fos ->
            ZipOutputStream(fos).use { zos ->
                writeEntry(zos, "[Content_Types].xml", contentTypesXml(workbook.sheets.size))
                writeEntry(zos, "_rels/.rels", rootRelsXml("xl/workbook.xml"))
                writeEntry(zos, "xl/workbook.xml", workbookXml(workbook.sheets))
                writeEntry(zos, "xl/_rels/workbook.xml.rels", workbookRelsXml(workbook.sheets.size))
                workbook.sheets.forEachIndexed { index, sheet ->
                    writeEntry(zos, "xl/worksheets/sheet${index + 1}.xml", sheetXml(sheet))
                }
            }
        }
    }

    private fun writeEntry(zos: ZipOutputStream, name: String, content: String) {
        zos.putNextEntry(ZipEntry(name))
        zos.write(content.toByteArray(Charsets.UTF_8))
        zos.closeEntry()
    }

    // ---- reading ----

    private fun readSharedStrings(zip: ZipFile): List<String> {
        val entry = zip.getEntry("xl/sharedStrings.xml") ?: return emptyList()
        val strings = ArrayList<String>()
        zip.getInputStream(entry).use { input ->
            val parser = Xml.newPullParser()
            parser.setInput(input, "UTF-8")
            var event = parser.eventType
            var inSi = false
            val text = StringBuilder()
            while (event != XmlPullParser.END_DOCUMENT) {
                when (event) {
                    XmlPullParser.START_TAG -> if (parser.name == "si") {
                        inSi = true
                        text.setLength(0)
                    }
                    XmlPullParser.TEXT -> if (inSi) text.append(parser.text)
                    XmlPullParser.END_TAG -> if (parser.name == "si") {
                        strings.add(text.toString())
                        inSi = false
                    }
                }
                event = parser.next()
            }
        }
        return strings
    }

    private fun readWorkbookRels(zip: ZipFile): Map<String, String> {
        val entry = zip.getEntry("xl/_rels/workbook.xml.rels") ?: return emptyMap()
        val map = HashMap<String, String>()
        zip.getInputStream(entry).use { input ->
            val parser = Xml.newPullParser()
            parser.setInput(input, "UTF-8")
            var event = parser.eventType
            while (event != XmlPullParser.END_DOCUMENT) {
                if (event == XmlPullParser.START_TAG && parser.name == "Relationship") {
                    val id = parser.getAttributeValue(null, "Id")
                    val target = parser.getAttributeValue(null, "Target")
                    if (id != null && target != null) map[id] = target
                }
                event = parser.next()
            }
        }
        return map
    }

    private fun readWorkbookSheets(zip: ZipFile): List<Pair<String, String>> {
        val relTargets = readWorkbookRels(zip)
        val entry = zip.getEntry("xl/workbook.xml") ?: return emptyList()
        val sheets = ArrayList<Pair<String, String>>()
        zip.getInputStream(entry).use { input ->
            val parser = Xml.newPullParser()
            parser.setInput(input, "UTF-8")
            var event = parser.eventType
            while (event != XmlPullParser.END_DOCUMENT) {
                if (event == XmlPullParser.START_TAG && parser.name == "sheet") {
                    val name = parser.getAttributeValue(null, "name") ?: "Sheet"
                    val rId = parser.getAttributeValue(null, "r:id")
                    val target = rId?.let { relTargets[it] }
                    if (target != null) sheets.add(name to target)
                }
                event = parser.next()
            }
        }
        return sheets
    }

    private fun readSheet(input: InputStream, sharedStrings: List<String>): MutableList<MutableList<String>> {
        val cells = HashMap<Pair<Int, Int>, String>()
        var maxRow = -1
        var maxCol = -1
        val parser = Xml.newPullParser()
        parser.setInput(input, "UTF-8")
        var event = parser.eventType
        var currentRef: String? = null
        var currentType: String? = null
        var inValue = false
        var inInlineText = false
        val valueText = StringBuilder()
        while (event != XmlPullParser.END_DOCUMENT) {
            when (event) {
                XmlPullParser.START_TAG -> when (parser.name) {
                    "c" -> {
                        currentRef = parser.getAttributeValue(null, "r")
                        currentType = parser.getAttributeValue(null, "t")
                        valueText.setLength(0)
                    }
                    "v" -> inValue = true
                    "t" -> inInlineText = true
                }
                XmlPullParser.TEXT -> if (inValue || inInlineText) valueText.append(parser.text)
                XmlPullParser.END_TAG -> when (parser.name) {
                    "v" -> inValue = false
                    "t" -> inInlineText = false
                    "c" -> {
                        val ref = currentRef
                        if (ref != null) {
                            val (col, row) = parseCellRef(ref)
                            if (row in 0 until MAX_ROWS && col in 0 until MAX_COLS) {
                                val raw = valueText.toString()
                                val display = if (currentType == "s") {
                                    raw.trim().toIntOrNull()?.let { sharedStrings.getOrNull(it) } ?: ""
                                } else {
                                    raw
                                }
                                if (display.isNotEmpty()) {
                                    cells[row to col] = display
                                    if (row > maxRow) maxRow = row
                                    if (col > maxCol) maxCol = col
                                }
                            }
                        }
                        currentRef = null
                        currentType = null
                    }
                }
            }
            event = parser.next()
        }
        val rowCount = (maxOf(maxRow + 1, DEFAULT_ROWS)).coerceAtMost(MAX_ROWS)
        val colCount = (maxOf(maxCol + 1, DEFAULT_COLS)).coerceAtMost(MAX_COLS)
        return MutableList(rowCount) { r -> MutableList(colCount) { c -> cells[r to c] ?: "" } }
    }

    /** "B3" -> (col=1, row=2), 0-based. */
    private fun parseCellRef(ref: String): Pair<Int, Int> {
        var col = 0
        var i = 0
        while (i < ref.length && ref[i].isLetter()) {
            col = col * 26 + (ref[i].uppercaseChar() - 'A' + 1)
            i++
        }
        val row = ref.substring(i).toIntOrNull() ?: 1
        return (col - 1) to (row - 1)
    }

    // ---- writing ----

    private fun escapeXml(s: String): String = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    private fun sheetXml(sheet: Sheet): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>")
        sheet.rows.forEachIndexed { rowIndex, row ->
            if (row.none { it.isNotEmpty() }) return@forEachIndexed
            sb.append("<row r=\"${rowIndex + 1}\">")
            row.forEachIndexed { colIndex, value ->
                if (value.isEmpty()) return@forEachIndexed
                val ref = "${columnName(colIndex)}${rowIndex + 1}"
                val number = value.toDoubleOrNull()
                if (number != null) {
                    sb.append("<c r=\"$ref\"><v>${escapeXml(value.trim())}</v></c>")
                } else {
                    sb.append("<c r=\"$ref\" t=\"inlineStr\"><is><t xml:space=\"preserve\">${escapeXml(value)}</t></is></c>")
                }
            }
            sb.append("</row>")
        }
        sb.append("</sheetData></worksheet>")
        return sb.toString()
    }

    private fun workbookXml(sheets: List<Sheet>): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" ")
        sb.append("xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>")
        sheets.forEachIndexed { index, sheet ->
            sb.append("<sheet name=\"${escapeXml(sheet.name)}\" sheetId=\"${index + 1}\" r:id=\"rId${index + 1}\"/>")
        }
        sb.append("</sheets></workbook>")
        return sb.toString()
    }

    private fun workbookRelsXml(sheetCount: Int): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">")
        for (i in 1..sheetCount) {
            sb.append("<Relationship Id=\"rId$i\" ")
            sb.append("Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" ")
            sb.append("Target=\"worksheets/sheet$i.xml\"/>")
        }
        sb.append("</Relationships>")
        return sb.toString()
    }

    fun rootRelsXml(mainTarget: String): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rId1\" " +
            "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" " +
            "Target=\"$mainTarget\"/>" +
            "</Relationships>"

    private fun contentTypesXml(sheetCount: Int): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">")
        sb.append("<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>")
        sb.append("<Default Extension=\"xml\" ContentType=\"application/xml\"/>")
        sb.append("<Override PartName=\"/xl/workbook.xml\" ")
        sb.append("ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>")
        for (i in 1..sheetCount) {
            sb.append("<Override PartName=\"/xl/worksheets/sheet$i.xml\" ")
            sb.append("ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>")
        }
        sb.append("</Types>")
        return sb.toString()
    }
}
