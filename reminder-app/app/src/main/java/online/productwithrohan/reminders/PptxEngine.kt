package online.productwithrohan.reminders

import android.util.Xml
import org.xmlpull.v1.XmlPullParser
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

/**
 * Hand-rolled minimal PPTX reader/writer: slides with a title and a body
 * text placeholder only — no images, transitions, or per-run styling in this
 * v1. Unlike XlsxEngine/DocxEngine, a valid pptx needs a slide master and at
 * least one slide layout (PowerPoint's own writer always emits real ones;
 * omitting them risks a "repair" prompt on open), so `save()` writes a
 * minimal-but-complete master/layout/slide chain rather than just the
 * top-level part.
 *
 * Uses java.util.zip and a namespace-unaware XmlPullParser, same as the
 * other two engines. **Not verified against real PowerPoint or LibreOffice**
 * — this sandbox has neither installed — only against the ECMA-376 part
 * structure from memory; treat pptx output as CI-compiled but UI-unverified
 * until someone opens one on a real device.
 */
object PptxEngine {

    class Slide(var title: String, var body: String)
    class Presentation(val slides: MutableList<Slide>)

    fun createBlank(): Presentation = Presentation(mutableListOf(Slide("", "")))

    fun load(file: File): Presentation {
        ZipFile(file).use { zip ->
            val relTargets = readPresentationRels(zip)
            val slideTargets = readSlideOrder(zip, relTargets)
            val slides = slideTargets.mapNotNull { target ->
                val normalized = if (target.startsWith("/")) target.removePrefix("/") else "ppt/$target"
                val entry = zip.getEntry(normalized) ?: zip.getEntry(target)
                entry?.let { zip.getInputStream(it).use { input -> readSlide(input) } }
            }.toMutableList()
            if (slides.isEmpty()) slides.add(Slide("", ""))
            return Presentation(slides)
        }
    }

    fun save(presentation: Presentation, file: File) {
        val slideCount = presentation.slides.size
        FileOutputStream(file).use { fos ->
            ZipOutputStream(fos).use { zos ->
                writeEntry(zos, "[Content_Types].xml", contentTypesXml(slideCount))
                writeEntry(zos, "_rels/.rels", XlsxEngine.rootRelsXml("ppt/presentation.xml"))
                writeEntry(zos, "ppt/presentation.xml", presentationXml(slideCount))
                writeEntry(zos, "ppt/_rels/presentation.xml.rels", presentationRelsXml(slideCount))
                writeEntry(zos, "ppt/slideMasters/slideMaster1.xml", slideMasterXml())
                writeEntry(zos, "ppt/slideMasters/_rels/slideMaster1.xml.rels", slideMasterRelsXml())
                writeEntry(zos, "ppt/slideLayouts/slideLayout1.xml", slideLayoutXml())
                writeEntry(zos, "ppt/slideLayouts/_rels/slideLayout1.xml.rels", slideLayoutRelsXml())
                presentation.slides.forEachIndexed { index, slide ->
                    writeEntry(zos, "ppt/slides/slide${index + 1}.xml", slideXml(slide))
                    writeEntry(zos, "ppt/slides/_rels/slide${index + 1}.xml.rels", slideRelsXml())
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

    private fun readPresentationRels(zip: ZipFile): Map<String, String> {
        val entry = zip.getEntry("ppt/_rels/presentation.xml.rels") ?: return emptyMap()
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

    private fun readSlideOrder(zip: ZipFile, relTargets: Map<String, String>): List<String> {
        val entry = zip.getEntry("ppt/presentation.xml") ?: return emptyList()
        val targets = ArrayList<String>()
        zip.getInputStream(entry).use { input ->
            val parser = Xml.newPullParser()
            parser.setInput(input, "UTF-8")
            var event = parser.eventType
            while (event != XmlPullParser.END_DOCUMENT) {
                if (event == XmlPullParser.START_TAG && parser.name == "p:sldId") {
                    val rId = parser.getAttributeValue(null, "r:id")
                    val target = rId?.let { relTargets[it] }
                    if (target != null) targets.add(target)
                }
                event = parser.next()
            }
        }
        return targets
    }

    private fun readSlide(input: java.io.InputStream): Slide {
        val parser = Xml.newPullParser()
        parser.setInput(input, "UTF-8")
        var event = parser.eventType

        var title = ""
        val body = StringBuilder()
        var currentPlaceholderType: String? = null
        var inText = false
        val runText = StringBuilder()

        while (event != XmlPullParser.END_DOCUMENT) {
            when (event) {
                XmlPullParser.START_TAG -> when (parser.name) {
                    "p:ph" -> currentPlaceholderType = parser.getAttributeValue(null, "type") ?: "body"
                    "p:sp" -> currentPlaceholderType = null
                    "a:p" -> runText.setLength(0)
                    "a:t" -> inText = true
                }
                XmlPullParser.TEXT -> if (inText) runText.append(parser.text)
                XmlPullParser.END_TAG -> when (parser.name) {
                    "a:t" -> inText = false
                    "a:p" -> {
                        val text = runText.toString()
                        if (text.isNotEmpty()) {
                            when (currentPlaceholderType) {
                                "title", "ctrTitle" ->
                                    title = if (title.isEmpty()) text else "$title\n$text"
                                else -> {
                                    if (body.isNotEmpty()) body.append('\n')
                                    body.append(text)
                                }
                            }
                        }
                    }
                }
            }
            event = parser.next()
        }
        return Slide(title, body.toString())
    }

    // ---- writing: presentation-level parts ----

    private fun escapeXml(s: String): String = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    private fun presentationXml(slideCount: Int): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<p:presentation xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" ")
        sb.append("xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" ")
        sb.append("xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">")
        sb.append("<p:sldMasterIdLst><p:sldMasterId id=\"2147483648\" r:id=\"rIdMaster\"/></p:sldMasterIdLst>")
        sb.append("<p:sldIdLst>")
        for (i in 0 until slideCount) {
            sb.append("<p:sldId id=\"${256 + i}\" r:id=\"rIdSlide${i + 1}\"/>")
        }
        sb.append("</p:sldIdLst>")
        sb.append("<p:sldSz cx=\"12192000\" cy=\"6858000\"/>")
        sb.append("<p:notesSz cx=\"6858000\" cy=\"9144000\"/>")
        sb.append("</p:presentation>")
        return sb.toString()
    }

    private fun presentationRelsXml(slideCount: Int): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">")
        sb.append("<Relationship Id=\"rIdMaster\" ")
        sb.append("Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster\" ")
        sb.append("Target=\"slideMasters/slideMaster1.xml\"/>")
        for (i in 1..slideCount) {
            sb.append("<Relationship Id=\"rIdSlide$i\" ")
            sb.append("Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" ")
            sb.append("Target=\"slides/slide$i.xml\"/>")
        }
        sb.append("</Relationships>")
        return sb.toString()
    }

    private fun slideMasterXml(): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<p:sldMaster xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" " +
            "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" " +
            "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">" +
            "<p:cSld><p:spTree>" +
            "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>" +
            "<p:grpSpPr/>" +
            "</p:spTree></p:cSld>" +
            "<p:clrMap bg1=\"lt1\" tx1=\"dk1\" bg2=\"lt2\" tx2=\"dk2\" accent1=\"accent1\" accent2=\"accent2\" " +
            "accent3=\"accent3\" accent4=\"accent4\" accent5=\"accent5\" accent6=\"accent6\" hlink=\"hlink\" " +
            "folHlink=\"folHlink\"/>" +
            "<p:sldLayoutIdLst><p:sldLayoutId id=\"2147483649\" r:id=\"rIdLayout\"/></p:sldLayoutIdLst>" +
            "</p:sldMaster>"

    private fun slideMasterRelsXml(): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rIdLayout\" " +
            "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout\" " +
            "Target=\"../slideLayouts/slideLayout1.xml\"/>" +
            "</Relationships>"

    private fun slideLayoutXml(): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<p:sldLayout xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" " +
            "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" " +
            "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" type=\"title\">" +
            "<p:cSld><p:spTree>" +
            "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>" +
            "<p:grpSpPr/>" +
            "</p:spTree></p:cSld>" +
            "</p:sldLayout>"

    private fun slideLayoutRelsXml(): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rIdMaster\" " +
            "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster\" " +
            "Target=\"../slideMasters/slideMaster1.xml\"/>" +
            "</Relationships>"

    private fun slideRelsXml(): String =
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            "<Relationship Id=\"rIdLayout\" " +
            "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout\" " +
            "Target=\"../slideLayouts/slideLayout1.xml\"/>" +
            "</Relationships>"

    private fun slideXml(slide: Slide): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<p:sld xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" ")
        sb.append("xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" ")
        sb.append("xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">")
        sb.append("<p:cSld><p:spTree>")
        sb.append("<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>")
        sb.append("<p:grpSpPr/>")
        sb.append(placeholderShapeXml(id = 2, name = "Title", type = "title", text = slide.title))
        sb.append(placeholderShapeXml(id = 3, name = "Body", type = "body", text = slide.body))
        sb.append("</p:spTree></p:cSld>")
        sb.append("</p:sld>")
        return sb.toString()
    }

    private fun placeholderShapeXml(id: Int, name: String, type: String, text: String): String {
        val sb = StringBuilder()
        sb.append("<p:sp><p:nvSpPr>")
        sb.append("<p:cNvPr id=\"$id\" name=\"$name\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>")
        sb.append("<p:nvPr><p:ph type=\"$type\"/></p:nvPr>")
        sb.append("</p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>")
        val lines = if (text.isEmpty()) listOf("") else text.split("\n")
        lines.forEach { line ->
            sb.append("<a:p>")
            if (line.isNotEmpty()) sb.append("<a:r><a:t>${escapeXml(line)}</a:t></a:r>")
            sb.append("</a:p>")
        }
        sb.append("</p:txBody></p:sp>")
        return sb.toString()
    }

    private fun contentTypesXml(slideCount: Int): String {
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
        sb.append("<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">")
        sb.append("<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>")
        sb.append("<Default Extension=\"xml\" ContentType=\"application/xml\"/>")
        sb.append("<Override PartName=\"/ppt/presentation.xml\" ")
        sb.append("ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml\"/>")
        sb.append("<Override PartName=\"/ppt/slideMasters/slideMaster1.xml\" ")
        sb.append("ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml\"/>")
        sb.append("<Override PartName=\"/ppt/slideLayouts/slideLayout1.xml\" ")
        sb.append("ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>")
        for (i in 1..slideCount) {
            sb.append("<Override PartName=\"/ppt/slides/slide$i.xml\" ")
            sb.append("ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>")
        }
        sb.append("</Types>")
        return sb.toString()
    }
}
