package online.productwithrohan.reminders

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

/**
 * Generic OOXML (docx/pptx/xlsx) compressor for Phase 4: walks every zip
 * entry of a source file and copies it into a fresh zip at maximum DEFLATE
 * compression, recompressing embedded JPEGs (under */media/) at reduced
 * quality first. It works directly on the raw zip container — unlike
 * XlsxEngine/DocxEngine/PptxEngine it never parses the document XML, so it's
 * lossless for everything those hand-rolled engines don't understand
 * (styles, formulas, charts, layout).
 *
 * Only JPEG entries are recompressed, deliberately: recompressing to a
 * different format while keeping the original zip entry's extension (e.g.
 * "image1.png") would desync it from the format [Content_Types].xml declares
 * for that extension, which stricter OOXML readers may reject. Re-encoding a
 * JPEG as a smaller JPEG keeps the format identical, so it's always safe.
 */
object OoxmlCompressor {

    class Result(
        val beforeTotalBytes: Long,
        val afterTotalBytes: Long,
        val imagesRecompressed: Int,
    )

    fun compress(source: File, destination: File): Result {
        var imagesRecompressed = 0
        ZipFile(source).use { zip ->
            FileOutputStream(destination).use { fos ->
                ZipOutputStream(fos).use { zos ->
                    zos.setLevel(9)
                    val entries = zip.entries()
                    while (entries.hasMoreElements()) {
                        val entry = entries.nextElement()
                        if (entry.isDirectory) continue
                        val bytes = zip.getInputStream(entry).use { it.readBytes() }
                        val outBytes = if (isRecompressibleJpeg(entry.name)) {
                            val recompressed = recompressJpeg(bytes)
                            if (recompressed != null && recompressed.size < bytes.size) {
                                imagesRecompressed++
                                recompressed
                            } else {
                                bytes
                            }
                        } else {
                            bytes
                        }
                        zos.putNextEntry(ZipEntry(entry.name))
                        zos.write(outBytes)
                        zos.closeEntry()
                    }
                }
            }
        }
        return Result(source.length(), destination.length(), imagesRecompressed)
    }

    private fun isRecompressibleJpeg(entryName: String): Boolean {
        if (!entryName.contains("/media/")) return false
        val ext = entryName.substringAfterLast('.', "").lowercase()
        return ext == "jpg" || ext == "jpeg"
    }

    private fun recompressJpeg(bytes: ByteArray): ByteArray? {
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 60, out)
        bitmap.recycle()
        return out.toByteArray()
    }
}
