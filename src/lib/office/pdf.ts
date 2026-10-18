import { getPdfjs } from "./pdfjs";
import { wrapLines } from "./wrap";
import type { Paragraph } from "./docx";

// PDF utilities shared by the PDF and Docs apps, ported from reminder-app's
// PdfToolsActivity (compress, unlock) and DocumentConverter.kt (PDF ⇄ Word,
// plain text only, no layout fidelity).

/** Re-encodes every JPEG image at the given quality, like PdfToolsActivity.compress. */
export async function compressPdf(bytes: Uint8Array, quality = 0.5): Promise<{ bytes: Uint8Array; images: number }> {
  const { PDFDocument, PDFName, PDFRawStream, PDFNumber } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  let images = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(PDFName.of("Subtype")) !== PDFName.of("Image")) continue;
    const filter = dict.get(PDFName.of("Filter"));
    if (filter !== PDFName.of("DCTDecode")) continue; // only plain JPEGs; others pass through
    try {
      const bmp = await createImageBitmap(new Blob([obj.contents as BlobPart], { type: "image/jpeg" }));
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext("2d")!.drawImage(bmp, 0, 0);
      bmp.close();
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (!blob) continue;
      const next = new Uint8Array(await blob.arrayBuffer());
      if (next.length >= obj.contents.length) continue;
      const newDict = dict.clone(doc.context);
      newDict.set(PDFName.of("Length"), PDFNumber.of(next.length));
      newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
      newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
      newDict.delete(PDFName.of("Decode"));
      newDict.delete(PDFName.of("DecodeParms"));
      doc.context.assign(ref, PDFRawStream.of(newDict, next));
      images++;
    } catch {
      // CMYK or otherwise undecodable JPEG: leave it as it was.
    }
  }
  return { bytes: await doc.save({ useObjectStreams: true }), images };
}

export async function isEncryptedPdf(bytes: Uint8Array): Promise<boolean> {
  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.isEncrypted;
}

/** Returns a decrypted copy; throws if the password is wrong. */
export async function unlockPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.load(bytes, { password });
  return doc.save();
}

/** AES-256 encrypts a PDF so it needs `password` to open. */
export async function protectPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.load(bytes);
  doc.encrypt({ userPassword: password, ownerPassword: password });
  return doc.save();
}

/** Text from each page, one paragraph per line, like DocumentConverter.pdfToDocx. */
export async function pdfToParagraphs(bytes: Uint8Array, pageIndexes?: number[]): Promise<Paragraph[]> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
  const pages = pageIndexes ?? Array.from({ length: doc.numPages }, (_, i) => i);
  const out: Paragraph[] = [];
  for (const i of pages) {
    const content = await (await doc.getPage(i + 1)).getTextContent();
    let line = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        out.push({ text: line.trimEnd(), bold: false, italic: false });
        line = "";
      }
    }
    if (line.trim()) out.push({ text: line.trimEnd(), bold: false, italic: false });
    out.push({ text: "", bold: false, italic: false }); // page gap
  }
  await doc.destroy();
  while (out.length > 1 && !out[out.length - 1].text) out.pop();
  return out.length ? out : [{ text: "", bold: false, italic: false }];
}

/** A4 text PDF from paragraphs, like DocumentConverter.docxToPdf (standard-14 fonts). */
export async function paragraphsToPdf(paragraphs: Paragraph[], title = "Document"): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const [W, H, M, SIZE] = [595, 842, 72, 11];
  const LEADING = SIZE * 1.45;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  for (const p of paragraphs) {
    const font = p.bold && p.italic ? fonts.boldItalic : p.bold ? fonts.bold : p.italic ? fonts.italic : fonts.regular;
    // WinAnsi-only, as the phone sanitizes before PDType1Font.encode.
    const safe = Array.from(p.text.replace(/\t/g, "    "))
      .map((ch) => {
        try {
          font.widthOfTextAtSize(ch, SIZE);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
    const lines = safe ? wrapLines(safe, (s) => font.widthOfTextAtSize(s, SIZE), W - M * 2) : [""];
    for (const line of lines) {
      if (y < M) {
        page = pdf.addPage([W, H]);
        y = H - M;
      }
      if (line) page.drawText(line, { x: M, y: y - SIZE, size: SIZE, font, color: rgb(0.1, 0.1, 0.12) });
      y -= LEADING;
    }
    y -= SIZE * 0.5;
  }
  return pdf.save();
}
