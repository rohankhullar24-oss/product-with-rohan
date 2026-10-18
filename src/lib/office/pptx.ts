import JSZip from "jszip";

// Slide titles and body text, the same narrow model as reminder-app's
// PptxEngine.kt. Reading walks the real slide order from presentation.xml;
// writing uses pptxgenjs, which emits a complete master/layout/theme chain
// so PowerPoint opens the file without a repair prompt.

export type Slide = { title: string; body: string };

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const parse = (s: string) => new DOMParser().parseFromString(s, "application/xml");

/**
 * Drops [Content_Types].xml overrides for parts the package doesn't contain.
 * pptxgenjs lists a slide master per slide but writes only one, which makes
 * the package invalid (and breaks pptx-preview, which loads every override).
 */
export async function pruneMissingParts(zip: JSZip): Promise<boolean> {
  const ct = zip.file("[Content_Types].xml");
  if (!ct) return false;
  const xml = await ct.async("string");
  let changed = false;
  const next = xml.replace(/<Override\b[^>]*PartName="\/([^"]+)"[^>]*\/>/g, (tag, part: string) => {
    if (zip.file(decodeURIComponent(part))) return tag;
    changed = true;
    return "";
  });
  if (changed) zip.file("[Content_Types].xml", next);
  return changed;
}

function shapeText(sp: Element): string {
  return Array.from(sp.getElementsByTagNameNS(A, "p"))
    .map((p) => Array.from(p.getElementsByTagNameNS(A, "t")).map((t) => t.textContent ?? "").join(""))
    .join("\n")
    .trim();
}

export async function readPptx(data: ArrayBuffer | Blob): Promise<Slide[]> {
  const zip = await JSZip.loadAsync(data);
  const pres = zip.file("ppt/presentation.xml");
  if (!pres) throw new Error("Not a PowerPoint file (no ppt/presentation.xml). Old .ppt files aren't supported.");
  const presXml = parse(await pres.async("string"));
  const rels = parse((await zip.file("ppt/_rels/presentation.xml.rels")?.async("string")) ?? "<Relationships/>");
  const targets = new Map(
    Array.from(rels.getElementsByTagName("Relationship")).map((r) => [r.getAttribute("Id"), r.getAttribute("Target") ?? ""])
  );
  const ids = Array.from(presXml.getElementsByTagNameNS(P, "sldId")).map((s) => s.getAttributeNS(R, "id") ?? s.getAttribute("r:id"));

  const slides: Slide[] = [];
  for (const id of ids) {
    const target = targets.get(id);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `ppt/${target.replace(/^\.\//, "")}`;
    const file = zip.file(path);
    if (!file) continue;
    const xml = parse(await file.async("string"));
    let title = "";
    const body: string[] = [];
    for (const sp of Array.from(xml.getElementsByTagNameNS(P, "sp"))) {
      const ph = sp.getElementsByTagNameNS(P, "ph")[0];
      const type = ph?.getAttribute("type") ?? "";
      const text = shapeText(sp);
      if (!text) continue;
      if (!title && (type === "title" || type === "ctrTitle")) title = text;
      else if (["sldNum", "dt", "ftr"].includes(type)) continue;
      else body.push(text);
    }
    // Slides without a title placeholder: promote their first text box.
    if (!title && body.length) title = body.shift()!;
    slides.push({ title, body: body.join("\n") });
  }
  return slides.length ? slides : [{ title: "", body: "" }];
}

export async function writePptx(slides: Slide[], theme: { background: string; accent: string; text: string }): Promise<Blob> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background.replace("#", "") };
    slide.addText(s.title || " ", {
      x: 0.5,
      y: 0.35,
      w: 9,
      h: 1,
      fontSize: 32,
      bold: true,
      color: theme.accent.replace("#", ""),
      fontFace: "Calibri",
    });
    if (s.body.trim()) {
      slide.addText(
        s.body.split("\n").map((line) => ({ text: line, options: { bullet: true, breakLine: true } })),
        { x: 0.6, y: 1.5, w: 8.8, h: 3.7, fontSize: 20, color: theme.text.replace("#", ""), fontFace: "Calibri", valign: "top" }
      );
    }
  }
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer);
  await pruneMissingParts(zip);
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
  });
}
