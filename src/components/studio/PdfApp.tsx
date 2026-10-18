"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowLeft,
  CheckSquare,
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  Highlighter,
  ImagePlus,
  MousePointer2,
  PenLine,
  Redo2,
  RotateCcw,
  RotateCw,
  Scissors,
  Square,
  Trash2,
  Type,
  Undo2,
  Eraser,
} from "lucide-react";
import {
  AppHeader,
  ErrorBanner,
  Panel,
  Slider,
  btn,
  btnPrimary,
  clamp,
  downloadBlob,
  handleUndoKeys,
  inputCls,
  labelCls,
  loadImage,
  readAsDataURL,
  toolBtnCls,
  uid,
  useHistory,
  useKeys,
} from "./shared";

// Page organizer + annotator. pdf.js renders pages for display; pdf-lib copies
// the original pages into a new file on export and flattens annotations,
// page numbers and the watermark onto them.

type Source = { id: string; name: string; bytes: ArrayBuffer; doc: PDFDocumentProxy };

type Annot = {
  id: string;
  type: "text" | "highlight" | "cover" | "box" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  size?: number;
  color: string;
  src?: string;
};

type PageRef = {
  id: string;
  kind: "pdf" | "blank" | "image";
  srcId?: string;
  index?: number;
  imageSrc?: string;
  w: number;
  h: number;
  baseRotation: number;
  rotation: number;
  annots: Annot[];
};

type DocState = {
  pages: PageRef[];
  numbering: { on: boolean; position: "center" | "right"; start: number; size: number };
  watermark: { on: boolean; text: string; opacity: number; size: number };
  meta: { title: string; author: string };
};

type Tool = "select" | "text" | "highlight" | "cover" | "box" | "signature" | "image";

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "select", label: "Select / move", icon: <MousePointer2 size={18} /> },
  { id: "text", label: "Add text", icon: <Type size={18} /> },
  { id: "highlight", label: "Highlight", icon: <Highlighter size={18} /> },
  { id: "cover", label: "White-out (covers, doesn't redact)", icon: <Eraser size={18} /> },
  { id: "box", label: "Rectangle", icon: <Square size={18} /> },
  { id: "signature", label: "Signature", icon: <PenLine size={18} /> },
  { id: "image", label: "Image", icon: <ImagePlus size={18} /> },
];

const A4 = { w: 595, h: 842 };

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

function hexRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
}

async function dataUrlBytes(url: string) {
  return (await fetch(url)).arrayBuffer();
}

/** Re-encodes any image as PNG or JPEG, the two formats PDF can embed. */
async function toEmbeddable(src: string): Promise<{ bytes: ArrayBuffer; png: boolean }> {
  if (src.startsWith("data:image/png")) return { bytes: await dataUrlBytes(src), png: true };
  if (src.startsWith("data:image/jpeg")) return { bytes: await dataUrlBytes(src), png: false };
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return { bytes: await dataUrlBytes(c.toDataURL("image/png")), png: true };
}

function SignaturePad({ onUse, onClose }: { onUse: (src: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(false);
  const pt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * e.currentTarget.width) / r.width, y: ((e.clientY - r.top) * e.currentTarget.height) / r.height };
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-sm font-semibold text-white">Draw your signature</h2>
        <canvas
          ref={ref}
          width={600}
          height={220}
          className="w-full touch-none rounded-md bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            last.current = pt(e);
          }}
          onPointerMove={(e) => {
            if (!last.current) return;
            const p = pt(e);
            const ctx = e.currentTarget.getContext("2d")!;
            ctx.strokeStyle = "#0b1f4b";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            setInked(true);
          }}
          onPointerUp={() => (last.current = null)}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            className={btn}
            onClick={() => {
              const c = ref.current!;
              c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
              setInked(false);
            }}
          >
            Clear
          </button>
          <button className={btn} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary} disabled={!inked} onClick={() => onUse(ref.current!.toDataURL("image/png"))}>
            Use signature
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PdfApp() {
  const [sources, setSources] = useState<Record<string, Source>>({});
  const hist = useHistory<DocState>(() => ({
    pages: [],
    numbering: { on: false, position: "center", start: 1, size: 10 },
    watermark: { on: false, text: "DRAFT", opacity: 0.15, size: 72 },
    meta: { title: "", author: "" },
  }));
  const st = hist.state;
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [selAnnot, setSelAnnot] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [padOpen, setPadOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ kind: "move" | "resize" | "create"; id: string; start: { x: number; y: number }; orig: Annot } | null>(null);
  const dragPage = useRef<string | null>(null);
  const openRef = useRef<HTMLInputElement>(null);
  const imgPagesRef = useRef<HTMLInputElement>(null);
  const annotImgRef = useRef<HTMLInputElement>(null);
  const pendingImgPt = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editWrapRef = useRef<HTMLDivElement>(null);

  const editPage = st.pages.find((p) => p.id === editId) ?? null;
  const annot = editPage?.annots.find((a) => a.id === selAnnot) ?? null;
  const thumbKey = (p: PageRef) => (p.kind === "pdf" ? `${p.srcId}:${p.index}` : p.id);

  // Render thumbnails for PDF pages that don't have one yet.
  useEffect(() => {
    const missing = st.pages.filter((p) => p.kind === "pdf" && !thumbs[thumbKey(p)] && sources[p.srcId!]);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      for (const p of missing) {
        if (cancelled) return;
        const page = await sources[p.srcId!].doc.getPage(p.index! + 1);
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 180 / Math.max(vp0.width, vp0.height) });
        const c = document.createElement("canvas");
        c.width = Math.ceil(vp.width);
        c.height = Math.ceil(vp.height);
        await page.render({ canvas: c, viewport: vp }).promise;
        const url = c.toDataURL("image/jpeg", 0.8);
        if (!cancelled) setThumbs((t) => ({ ...t, [thumbKey(p)]: url }));
      }
    })().catch((err) => console.error("thumbnail render failed", err));
    return () => {
      cancelled = true;
    };
  }, [st.pages, sources, thumbs]);

  // Render the page being edited at a size that fits the workspace.
  useEffect(() => {
    if (!editPage || !canvasRef.current) return;
    let cancelled = false;
    const wrapW = editWrapRef.current?.clientWidth ?? 800;
    const s = clamp((wrapW - 48) / editPage.w, 0.3, 2.5);
    (async () => {
      const c = canvasRef.current!;
      c.width = Math.ceil(editPage.w * s);
      c.height = Math.ceil(editPage.h * s);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      if (editPage.kind === "pdf") {
        const page = await sources[editPage.srcId!].doc.getPage(editPage.index! + 1);
        if (cancelled) return;
        await page.render({ canvas: c, viewport: page.getViewport({ scale: s }) }).promise;
      } else if (editPage.kind === "image" && editPage.imageSrc) {
        const img = await loadImage(editPage.imageSrc);
        if (!cancelled) ctx.drawImage(img, 0, 0, c.width, c.height);
      }
      if (!cancelled) setScale(s);
    })().catch(() => !cancelled && setError("Couldn't render that page."));
    return () => {
      cancelled = true;
    };
    // Re-render only when the page itself changes, not its annotations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPage?.id, editPage?.w, sources]);

  // ---------- loading ----------

  async function openPdfs(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy("Opening…");
    try {
      const pdfjs = await getPdfjs();
      const added: PageRef[] = [];
      const newSources: Record<string, Source> = {};
      for (const f of files) {
        try {
          const bytes = await f.arrayBuffer();
          const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
          const id = uid("src");
          newSources[id] = { id, name: f.name, bytes, doc };
          for (let i = 0; i < doc.numPages; i++) {
            const page = await doc.getPage(i + 1);
            const vp = page.getViewport({ scale: 1 });
            added.push({ id: uid("pg"), kind: "pdf", srcId: id, index: i, w: vp.width, h: vp.height, baseRotation: page.rotate, rotation: 0, annots: [] });
          }
        } catch {
          setError(`Couldn't open ${f.name}. It may be damaged or password-protected.`);
        }
      }
      setSources((s) => ({ ...s, ...newSources }));
      if (added.length) {
        hist.set((d) => ({ ...d, pages: [...d.pages, ...added], meta: d.meta.title ? d.meta : { ...d.meta, title: files[0].name.replace(/\.pdf$/i, "") } }));
      }
    } finally {
      setBusy(null);
    }
  }

  async function addImagePages(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const added: PageRef[] = [];
    for (const f of files) {
      try {
        const src = await readAsDataURL(f);
        const img = await loadImage(src);
        // Long edge matches A4's, so photos print at a sensible size.
        const k = A4.h / Math.max(img.naturalWidth, img.naturalHeight);
        added.push({ id: uid("pg"), kind: "image", imageSrc: src, w: img.naturalWidth * k, h: img.naturalHeight * k, baseRotation: 0, rotation: 0, annots: [] });
      } catch {
        setError(`Couldn't read ${f.name}.`);
      }
    }
    if (added.length) hist.set((d) => ({ ...d, pages: [...d.pages, ...added] }));
  }

  function addBlank() {
    const after = checked.length ? Math.max(...checked.map((id) => st.pages.findIndex((p) => p.id === id))) + 1 : st.pages.length;
    const ref = st.pages[after - 1];
    const page: PageRef = { id: uid("pg"), kind: "blank", w: ref?.w ?? A4.w, h: ref?.h ?? A4.h, baseRotation: 0, rotation: 0, annots: [] };
    hist.set((d) => {
      const pages = [...d.pages];
      pages.splice(after, 0, page);
      return { ...d, pages };
    });
  }

  // ---------- organizing ----------

  const targets = checked.length ? checked : [];

  function rotate(ids: string[], deg: number) {
    hist.set((d) => ({ ...d, pages: d.pages.map((p) => (ids.includes(p.id) ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p)) }));
  }

  function removePages(ids: string[]) {
    hist.set((d) => ({ ...d, pages: d.pages.filter((p) => !ids.includes(p.id)) }));
    setChecked([]);
  }

  function duplicatePages(ids: string[]) {
    hist.set((d) => ({
      ...d,
      pages: d.pages.flatMap((p) => (ids.includes(p.id) ? [p, { ...p, id: uid("pg"), annots: p.annots.map((a) => ({ ...a, id: uid("a") })) }] : [p])),
    }));
  }

  function dropOn(targetId: string) {
    const from = dragPage.current;
    dragPage.current = null;
    if (!from || from === targetId) return;
    hist.set((d) => {
      const moving = d.pages.find((p) => p.id === from)!;
      const rest = d.pages.filter((p) => p.id !== from);
      const at = rest.findIndex((p) => p.id === targetId);
      rest.splice(at, 0, moving);
      return { ...d, pages: rest };
    });
  }

  // ---------- export ----------

  async function buildPdf(pages: PageRef[], withExtras = true): Promise<Uint8Array> {
    const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
    const out = await PDFDocument.create();
    const loaded = new Map<string, Awaited<ReturnType<typeof PDFDocument.load>>>();
    const helv = await out.embedFont(StandardFonts.Helvetica);
    const helvBold = await out.embedFont(StandardFonts.HelveticaBold);
    const safe = (s: string, font: typeof helv) =>
      Array.from(s)
        .map((ch) => {
          try {
            font.widthOfTextAtSize(ch, 10);
            return ch;
          } catch {
            return "?";
          }
        })
        .join("");

    for (let n = 0; n < pages.length; n++) {
      const ref = pages[n];
      let page;
      if (ref.kind === "pdf") {
        let src = loaded.get(ref.srcId!);
        if (!src) {
          src = await PDFDocument.load(sources[ref.srcId!].bytes, { ignoreEncryption: true });
          loaded.set(ref.srcId!, src);
        }
        const [copied] = await out.copyPages(src, [ref.index!]);
        page = out.addPage(copied);
      } else {
        page = out.addPage([ref.w, ref.h]);
        if (ref.kind === "image" && ref.imageSrc) {
          const { bytes, png } = await toEmbeddable(ref.imageSrc);
          const img = png ? await out.embedPng(bytes) : await out.embedJpg(bytes);
          page.drawImage(img, { x: 0, y: 0, width: ref.w, height: ref.h });
        }
      }
      const mb = page.getMediaBox();
      const top = mb.y + mb.height;
      for (const a of ref.annots) {
        const x = mb.x + a.x;
        const y = top - a.y - a.h;
        if (a.type === "highlight") page.drawRectangle({ x, y, width: a.w, height: a.h, color: rgb(...hexRgb(a.color)), opacity: 0.35 });
        else if (a.type === "cover") page.drawRectangle({ x, y, width: a.w, height: a.h, color: rgb(1, 1, 1) });
        else if (a.type === "box") page.drawRectangle({ x, y, width: a.w, height: a.h, borderColor: rgb(...hexRgb(a.color)), borderWidth: 1.5 });
        else if (a.type === "image" && a.src) {
          const { bytes, png } = await toEmbeddable(a.src);
          const img = png ? await out.embedPng(bytes) : await out.embedJpg(bytes);
          page.drawImage(img, { x, y, width: a.w, height: a.h });
        } else if (a.type === "text" && a.text) {
          const size = a.size ?? 14;
          safe(a.text, helv)
            .split("\n")
            .forEach((line, i) => page.drawText(line, { x, y: top - a.y - size * (i + 0.85) * 1.2, size, font: helv, color: rgb(...hexRgb(a.color)) }));
        }
      }
      if (withExtras && st.watermark.on && st.watermark.text) {
        const text = safe(st.watermark.text, helvBold);
        const size = st.watermark.size;
        const tw = helvBold.widthOfTextAtSize(text, size);
        const angle = Math.atan2(mb.height, mb.width);
        page.drawText(text, {
          x: mb.x + mb.width / 2 - (Math.cos(angle) * tw) / 2 + (Math.sin(angle) * size) / 3,
          y: mb.y + mb.height / 2 - (Math.sin(angle) * tw) / 2 - (Math.cos(angle) * size) / 3,
          size,
          font: helvBold,
          color: rgb(0.5, 0.5, 0.5),
          opacity: st.watermark.opacity,
          rotate: degrees((angle * 180) / Math.PI),
        });
      }
      if (withExtras && st.numbering.on) {
        const label = String(st.numbering.start + n);
        const size = st.numbering.size;
        const tw = helv.widthOfTextAtSize(label, size);
        const x = st.numbering.position === "center" ? mb.x + (mb.width - tw) / 2 : mb.x + mb.width - 36 - tw;
        page.drawText(label, { x, y: mb.y + 24, size, font: helv, color: rgb(0.2, 0.2, 0.2) });
      }
      page.setRotation(degrees((page.getRotation().angle + ref.rotation) % 360));
    }
    if (st.meta.title) out.setTitle(st.meta.title);
    if (st.meta.author) out.setAuthor(st.meta.author);
    out.setProducer("Open Studio · PDF");
    return out.save();
  }

  async function exportPages(pages: PageRef[], name: string) {
    if (!pages.length) return;
    setBusy("Building PDF…");
    try {
      const bytes = await buildPdf(pages);
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), name);
    } catch (err) {
      console.error(err);
      setError("Couldn't build the PDF. Encrypted PDFs can be viewed but not re-saved here.");
    } finally {
      setBusy(null);
    }
  }

  async function splitAll() {
    for (let i = 0; i < st.pages.length; i++) {
      setBusy(`Splitting page ${i + 1} of ${st.pages.length}…`);
      try {
        const bytes = await buildPdf([st.pages[i]]);
        downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `page-${i + 1}.pdf`);
      } catch {
        setError("Couldn't split this PDF.");
        break;
      }
    }
    setBusy(null);
  }

  // ---------- annotation editing ----------

  function patchAnnots(fn: (a: Annot[]) => Annot[], commit = true) {
    if (!editPage) return;
    hist.set((d) => ({ ...d, pages: d.pages.map((p) => (p.id === editPage.id ? { ...p, annots: fn(p.annots) } : p)) }), commit);
  }

  function pagePt(e: { clientX: number; clientY: number }) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * editPage!.w, y: ((e.clientY - r.top) / r.height) * editPage!.h };
  }

  function addAnnot(a: Omit<Annot, "id">) {
    const full = { ...a, id: uid("a") };
    patchAnnots((as) => [...as, full]);
    setSelAnnot(full.id);
    return full;
  }

  async function onEditDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editPage) return;
    const p = pagePt(e);
    const t = e.target as HTMLElement;
    const aid = t.closest("[data-annot]")?.getAttribute("data-annot");
    const isHandle = !!t.closest("[data-resize]");
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "select") {
      const a = editPage.annots.find((x) => x.id === aid);
      setSelAnnot(a?.id ?? null);
      if (a) dragRef.current = { kind: isHandle ? "resize" : "move", id: a.id, start: p, orig: a };
      return;
    }
    if (tool === "text") {
      addAnnot({ type: "text", x: p.x, y: p.y, w: 160, h: 20, text: "Type here", size: 14, color: "#111827" });
      setTool("select");
      return;
    }
    if (tool === "signature") {
      if (!signature) {
        setPadOpen(true);
        return;
      }
      const img = await loadImage(signature);
      const w = 180;
      addAnnot({ type: "image", x: p.x - w / 2, y: p.y - (w * img.naturalHeight) / img.naturalWidth / 2, w, h: (w * img.naturalHeight) / img.naturalWidth, color: "#000", src: signature });
      setTool("select");
      return;
    }
    if (tool === "image") {
      pendingImgPt.current = p;
      annotImgRef.current?.click();
      return;
    }
    const a = addAnnot({ type: tool, x: p.x, y: p.y, w: 0, h: 0, color: tool === "highlight" ? "#facc15" : "#dc2626" });
    dragRef.current = { kind: "create", id: a.id, start: p, orig: a };
  }

  function onEditMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || !editPage) return;
    const p = pagePt(e);
    patchAnnots(
      (as) =>
        as.map((a) => {
          if (a.id !== d.id) return a;
          if (d.kind === "move") return { ...a, x: d.orig.x + p.x - d.start.x, y: d.orig.y + p.y - d.start.y };
          if (d.kind === "resize") {
            const w = Math.max(8, d.orig.w + p.x - d.start.x);
            const h = Math.max(8, d.orig.h + p.y - d.start.y);
            // Text scales its font with the box; images keep their aspect ratio.
            if (a.type === "text") return { ...a, w, h, size: Math.max(4, ((d.orig.size ?? 14) * h) / d.orig.h) };
            if (a.type === "image") return { ...a, w, h: (w * d.orig.h) / d.orig.w };
            return { ...a, w, h };
          }
          return { ...a, x: Math.min(d.start.x, p.x), y: Math.min(d.start.y, p.y), w: Math.abs(p.x - d.start.x), h: Math.abs(p.y - d.start.y) };
        }),
      false,
    );
  }

  function onEditUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.kind === "create") {
      const a = editPage?.annots.find((x) => x.id === d.id);
      if (a && (a.w < 4 || a.h < 4)) patchAnnots((as) => as.map((x) => (x.id === a.id ? { ...x, w: 140, h: a.type === "highlight" ? 16 : 60 } : x)));
      else hist.commit();
      setTool("select");
    } else hist.commit();
  }

  async function placeAnnotImage(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    const p = pendingImgPt.current;
    pendingImgPt.current = null;
    if (!f || !p || !editPage) return;
    try {
      const src = await readAsDataURL(f);
      const img = await loadImage(src);
      const w = Math.min(220, editPage.w * 0.5);
      addAnnot({ type: "image", x: p.x, y: p.y, w, h: (w * img.naturalHeight) / img.naturalWidth, color: "#000", src });
      setTool("select");
    } catch {
      setError("Couldn't read that image.");
    }
  }

  useKeys((e) => {
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    if (e.metaKey || e.ctrlKey) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (editPage && selAnnot) {
        patchAnnots((as) => as.filter((a) => a.id !== selAnnot));
        setSelAnnot(null);
      } else if (!editPage && checked.length) removePages(checked);
    } else if (e.key === "Escape") {
      if (editPage) setEditId(null);
      else setChecked([]);
    }
  });

  // ---------- UI ----------

  const iconBtn = `${btn} px-2`;
  const editIdx = editPage ? st.pages.findIndex((p) => p.id === editPage.id) : -1;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={openRef} type="file" accept="application/pdf" multiple className="hidden" onChange={openPdfs} />
      <input ref={imgPagesRef} type="file" accept="image/*" multiple className="hidden" onChange={addImagePages} />
      <input ref={annotImgRef} type="file" accept="image/*" className="hidden" onChange={placeAnnotImage} />
      {padOpen && (
        <SignaturePad
          onClose={() => setPadOpen(false)}
          onUse={(src) => {
            setSignature(src);
            setPadOpen(false);
            setTool("signature");
          }}
        />
      )}
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="PDF" replaces="Acrobat" blurb="Merge, reorder, rotate and split PDFs; add text, highlights and signatures. Files stay on your device.">
          <button className={btn} onClick={() => openRef.current?.click()}>
            <FolderOpen size={14} /> {st.pages.length ? "Add PDFs" : "Open PDF"}
          </button>
          <button className={btn} onClick={() => imgPagesRef.current?.click()}>
            <ImagePlus size={14} /> Images to pages
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo">
            <Undo2 size={14} />
          </button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo">
            <Redo2 size={14} />
          </button>
          <button className={btnPrimary} disabled={!st.pages.length || !!busy} onClick={() => exportPages(st.pages, `${st.meta.title || "document"}.pdf`)}>
            <Download size={14} /> Save PDF
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {busy && <p className="mb-3 text-sm text-accent">{busy}</p>}

        {!st.pages.length ? (
          <button
            onClick={() => openRef.current?.click()}
            className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 text-slate-400 hover:border-accent hover:text-white"
          >
            <FolderOpen size={28} />
            <span className="text-sm">Open one or more PDFs (or start with images)</span>
          </button>
        ) : editPage ? (
          <div className="grid gap-3 lg:grid-cols-[52px_minmax(0,1fr)_280px]">
            <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-1.5 lg:flex-col">
              <button className={toolBtnCls(false)} onClick={() => setEditId(null)} title="Back to pages" aria-label="Back to pages">
                <ArrowLeft size={18} />
              </button>
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={tool === t.id}
                  onClick={() => (t.id === "signature" && !signature ? setPadOpen(true) : setTool(t.id))}
                  className={toolBtnCls(tool === t.id)}
                >
                  {t.icon}
                </button>
              ))}
            </nav>
            <div ref={editWrapRef} className="flex h-[70vh] overflow-auto rounded-xl border border-slate-800 bg-[#0A0D12] lg:h-[calc(100vh-200px)]">
              <div className="m-auto p-6">
                <div
                  className="relative touch-none shadow-2xl shadow-black/60 select-none"
                  onPointerDown={onEditDown}
                  onPointerMove={onEditMove}
                  onPointerUp={onEditUp}
                  style={{ cursor: tool === "select" ? "default" : "crosshair" }}
                >
                  <canvas ref={canvasRef} className="block" />
                  {editPage.annots.map((a) => {
                    const style = { left: a.x * scale, top: a.y * scale, width: a.w * scale, height: a.h * scale };
                    const on = a.id === selAnnot;
                    return (
                      <div key={a.id} data-annot={a.id} className={`absolute ${on ? "outline outline-1 outline-teal-500" : ""}`} style={style}>
                        {a.type === "highlight" && <div className="h-full w-full" style={{ background: a.color, opacity: 0.35 }} />}
                        {a.type === "cover" && <div className="h-full w-full bg-white" />}
                        {a.type === "box" && <div className="h-full w-full" style={{ border: `${1.5 * scale}px solid ${a.color}` }} />}
                        {a.type === "image" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.src} alt="" draggable={false} className="h-full w-full" />
                        )}
                        {a.type === "text" && (
                          <div style={{ font: `${(a.size ?? 14) * scale}px Helvetica, Arial, sans-serif`, lineHeight: 1.2, color: a.color, whiteSpace: "pre" }}>{a.text}</div>
                        )}
                        {on && <div data-resize className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize border border-teal-600 bg-white" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <aside className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
              <Panel title={`Page ${editIdx + 1} of ${st.pages.length}`}>
                <div className="flex gap-1">
                  <button className={btn} disabled={editIdx <= 0} onClick={() => setEditId(st.pages[editIdx - 1].id)}>
                    Previous
                  </button>
                  <button className={btn} disabled={editIdx >= st.pages.length - 1} onClick={() => setEditId(st.pages[editIdx + 1].id)}>
                    Next
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Pick a tool, then click or drag on the page. White-out hides content visually; the original text is still in the file, so it is not a secure redaction.
                </p>
              </Panel>
              {annot && (
                <Panel title="Selected">
                  <div className="flex flex-col gap-3">
                    {annot.type === "text" && (
                      <>
                        <textarea
                          className={inputCls}
                          rows={3}
                          value={annot.text}
                          onChange={(e) => {
                            const text = e.target.value;
                            const size = annot.size ?? 14;
                            const lines = text.split("\n");
                            const ctx = document.createElement("canvas").getContext("2d")!;
                            ctx.font = `${size}px Helvetica, Arial, sans-serif`;
                            const w = Math.max(20, ...lines.map((l) => ctx.measureText(l).width));
                            patchAnnots((as) => as.map((a) => (a.id === annot.id ? { ...a, text, w, h: size * 1.2 * lines.length } : a)), false);
                          }}
                        />
                        <Slider
                          label="Size"
                          value={annot.size ?? 14}
                          min={6}
                          max={72}
                          unit="pt"
                          onChange={(v) => patchAnnots((as) => as.map((a) => (a.id === annot.id ? { ...a, size: v, w: (a.w * v) / (a.size ?? 14), h: (a.h * v) / (a.size ?? 14) } : a)), false)}
                        />
                      </>
                    )}
                    {(annot.type === "text" || annot.type === "box" || annot.type === "highlight") && (
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        Color
                        <input type="color" value={annot.color} onChange={(e) => patchAnnots((as) => as.map((a) => (a.id === annot.id ? { ...a, color: e.target.value } : a)), false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" />
                      </label>
                    )}
                    <button
                      className={btn}
                      onClick={() => {
                        patchAnnots((as) => as.filter((a) => a.id !== annot.id));
                        setSelAnnot(null);
                      }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </Panel>
              )}
              {signature && (
                <Panel title="Signature" right={<button className="text-xs text-slate-400 hover:text-white" onClick={() => setPadOpen(true)}>Redraw</button>}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signature} alt="Your signature" className="w-full rounded bg-white" />
                </Panel>
              )}
            </aside>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <button className={btn} onClick={() => setChecked(checked.length === st.pages.length ? [] : st.pages.map((p) => p.id))}>
                  <CheckSquare size={14} /> {checked.length === st.pages.length ? "Select none" : "Select all"}
                </button>
                <span className="mx-1 h-5 w-px bg-slate-700" />
                <button className={iconBtn} disabled={!targets.length} onClick={() => rotate(targets, -90)} title="Rotate left">
                  <RotateCcw size={14} />
                </button>
                <button className={iconBtn} disabled={!targets.length} onClick={() => rotate(targets, 90)} title="Rotate right">
                  <RotateCw size={14} />
                </button>
                <button className={iconBtn} disabled={!targets.length} onClick={() => duplicatePages(targets)} title="Duplicate">
                  <Copy size={14} />
                </button>
                <button className={iconBtn} disabled={!targets.length} onClick={() => removePages(targets)} title="Delete">
                  <Trash2 size={14} />
                </button>
                <button className={btn} disabled={!targets.length || !!busy} onClick={() => exportPages(st.pages.filter((p) => targets.includes(p.id)), "extracted.pdf")}>
                  <Download size={14} /> Extract selected
                </button>
                <button className={btn} disabled={st.pages.length < 2 || !!busy} onClick={splitAll}>
                  <Scissors size={14} /> Split all
                </button>
                <button className={btn} onClick={addBlank}>
                  <FilePlus size={14} /> Blank page
                </button>
                <span className={`${labelCls} ml-auto`}>
                  {st.pages.length} pages · {checked.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {st.pages.map((p, i) => {
                  const on = checked.includes(p.id);
                  const thumb = p.kind === "pdf" ? thumbs[thumbKey(p)] : p.imageSrc;
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => (dragPage.current = p.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOn(p.id)}
                      onClick={(e) => setChecked((c) => (e.shiftKey || e.metaKey || e.ctrlKey ? (on ? c.filter((x) => x !== p.id) : [...c, p.id]) : on && c.length === 1 ? [] : [p.id]))}
                      onDoubleClick={() => {
                        setEditId(p.id);
                        setTool("select");
                        setSelAnnot(null);
                      }}
                      className={`group cursor-pointer rounded-lg border-2 p-2 text-center transition-colors ${on ? "border-accent bg-accent/10" : "border-transparent hover:border-slate-600"}`}
                    >
                      <div className="flex aspect-[3/4] items-center justify-center">
                        <div className="relative bg-white shadow-md transition-transform" style={{ transform: `rotate(${p.rotation}deg)`, width: p.w >= p.h ? "100%" : `${(p.w / p.h) * 100}%`, aspectRatio: `${p.w} / ${p.h}` }}>
                          {thumb && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={`Page ${i + 1}`} className="h-full w-full object-contain" draggable={false} />
                          )}
                          {p.annots.length > 0 && <span className="absolute top-1 right-1 rounded bg-accent px-1 text-[9px] text-white">{p.annots.length}</span>}
                        </div>
                      </div>
                      <span className="mt-1.5 block text-[11px] text-slate-400">
                        {i + 1}
                        {p.kind !== "pdf" && ` · ${p.kind}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-slate-500">Drag to reorder · click to select (Shift/Ctrl for several) · double-click a page to annotate it</p>
            </div>

            <aside className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
              <Panel title="Page numbers">
                <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={st.numbering.on} onChange={(e) => hist.set((d) => ({ ...d, numbering: { ...d.numbering, on: e.target.checked } }))} className="accent-teal-500" /> Add page numbers
                </label>
                {st.numbering.on && (
                  <div className="flex flex-col gap-3">
                    <select className={inputCls} value={st.numbering.position} onChange={(e) => hist.set((d) => ({ ...d, numbering: { ...d.numbering, position: e.target.value as "center" | "right" } }))}>
                      <option value="center">Bottom center</option>
                      <option value="right">Bottom right</option>
                    </select>
                    <Slider label="Start at" value={st.numbering.start} min={0} max={100} onChange={(v) => hist.set((d) => ({ ...d, numbering: { ...d.numbering, start: v } }), false)} />
                    <Slider label="Size" value={st.numbering.size} min={6} max={24} unit="pt" onChange={(v) => hist.set((d) => ({ ...d, numbering: { ...d.numbering, size: v } }), false)} />
                  </div>
                )}
              </Panel>
              <Panel title="Watermark">
                <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={st.watermark.on} onChange={(e) => hist.set((d) => ({ ...d, watermark: { ...d.watermark, on: e.target.checked } }))} className="accent-teal-500" /> Stamp every page
                </label>
                {st.watermark.on && (
                  <div className="flex flex-col gap-3">
                    <input className={inputCls} value={st.watermark.text} onChange={(e) => hist.set((d) => ({ ...d, watermark: { ...d.watermark, text: e.target.value } }), false)} />
                    <Slider label="Opacity" value={Math.round(st.watermark.opacity * 100)} min={5} max={100} unit="%" onChange={(v) => hist.set((d) => ({ ...d, watermark: { ...d.watermark, opacity: v / 100 } }), false)} />
                    <Slider label="Size" value={st.watermark.size} min={18} max={160} unit="pt" onChange={(v) => hist.set((d) => ({ ...d, watermark: { ...d.watermark, size: v } }), false)} />
                  </div>
                )}
              </Panel>
              <Panel title="Document info">
                <div className="flex flex-col gap-2">
                  <input className={inputCls} placeholder="Title" value={st.meta.title} onChange={(e) => hist.set((d) => ({ ...d, meta: { ...d.meta, title: e.target.value } }), false)} />
                  <input className={inputCls} placeholder="Author" value={st.meta.author} onChange={(e) => hist.set((d) => ({ ...d, meta: { ...d.meta, author: e.target.value } }), false)} />
                  <p className="text-xs text-slate-500">Sources: {Object.values(sources).map((s) => s.name).join(", ") || "images only"}</p>
                </div>
              </Panel>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
