import JSZip from "jszip";

// Minimal .docx reader/writer, a port of reminder-app's DocxEngine.kt:
// paragraphs of plain text with a whole-paragraph bold/italic flag. On load,
// a paragraph's runs are joined and it counts as bold/italic if any run is.
// Unlike the phone, saving a document that was opened keeps the original
// package (styles, headers, numbering) and only replaces the body text.

export type Paragraph = { text: string; bold: boolean; italic: boolean };
export type DocxDocument = { paragraphs: Paragraph[]; source?: JSZip };

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export function blankDocx(): DocxDocument {
  return { paragraphs: [{ text: "", bold: false, italic: false }] };
}

export function fromPlainText(text: string): DocxDocument {
  const paragraphs = text.split("\n").map((t) => ({ text: t, bold: false, italic: false }));
  return { paragraphs: paragraphs.length ? paragraphs : blankDocx().paragraphs };
}

function isOn(el: Element | undefined) {
  if (!el) return false;
  const v = el.getAttributeNS(W_NS, "val") ?? el.getAttribute("w:val");
  return v !== "false" && v !== "0" && v !== "none";
}

export async function readDocx(data: ArrayBuffer | Blob): Promise<DocxDocument> {
  const zip = await JSZip.loadAsync(data);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Not a Word document (no word/document.xml). Old .doc files aren't supported.");
  const xml = new DOMParser().parseFromString(await file.async("string"), "application/xml");
  const body = xml.getElementsByTagNameNS(W_NS, "body")[0];
  const paragraphs: Paragraph[] = [];
  for (const p of Array.from(body?.getElementsByTagNameNS(W_NS, "p") ?? [])) {
    let text = "";
    let bold = false;
    let italic = false;
    for (const r of Array.from(p.getElementsByTagNameNS(W_NS, "r"))) {
      const rPr = r.getElementsByTagNameNS(W_NS, "rPr")[0];
      if (rPr) {
        bold ||= isOn(rPr.getElementsByTagNameNS(W_NS, "b")[0]);
        italic ||= isOn(rPr.getElementsByTagNameNS(W_NS, "i")[0]);
      }
      for (const node of Array.from(r.childNodes)) {
        if (!(node instanceof Element)) continue;
        if (node.localName === "t") text += node.textContent ?? "";
        else if (node.localName === "tab") text += "\t";
        else if (node.localName === "br" || node.localName === "cr") text += "\n";
      }
    }
    paragraphs.push({ text, bold, italic });
  }
  return { paragraphs: paragraphs.length ? paragraphs : blankDocx().paragraphs, source: zip };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function paragraphXml(p: Paragraph) {
  const rPr = p.bold || p.italic ? `<w:rPr>${p.bold ? "<w:b/>" : ""}${p.italic ? "<w:i/>" : ""}</w:rPr>` : "";
  const parts = p.text.split("\n").map((line, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t>`);
  return `<w:p>${p.text ? `<w:r>${rPr}${parts.join("")}</w:r>` : ""}</w:p>`;
}

const DOC_HEAD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;
const A4_SECT = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

export async function writeDocx(doc: DocxDocument): Promise<Blob> {
  const paras = doc.paragraphs.map(paragraphXml).join("");
  const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (doc.source) {
    const zip = doc.source;
    const original = await zip.file("word/document.xml")!.async("string");
    // Keep the original section properties (page size, margins, headers).
    const sect = original.match(/<w:sectPr[\s\S]*?<\/w:sectPr>(?![\s\S]*<w:sectPr)/)?.[0] ?? A4_SECT;
    const next = original.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${paras}${sect}</w:body>`);
    zip.file("word/document.xml", next);
    return zip.generateAsync({ type: "blob", mimeType: mime, compression: "DEFLATE" });
  }
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  zip.file("word/document.xml", `${DOC_HEAD}<w:body>${paras}${A4_SECT}</w:body></w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: mime, compression: "DEFLATE" });
}
