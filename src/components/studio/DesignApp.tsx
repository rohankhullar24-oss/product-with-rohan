"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BringToFront,
  Circle,
  Copy,
  Download,
  FilePlus,
  ImagePlus,
  Minus,
  MousePointer2,
  Redo2,
  SendToBack,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
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

// Page layout in PDF points. Text is line-broken by our own wrapper in both
// the editor and the PDF export so the two stay in step, and the fonts are
// the three metric-compatible families every PDF reader ships with.

type FontKey = "sans" | "serif" | "mono";
type Tool = "select" | "text" | "image" | "rect" | "ellipse" | "line";

type Frame = {
  id: string;
  type: "text" | "image" | "rect" | "ellipse" | "line";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  font: FontKey;
  size: number;
  lineHeight: number;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  radius: number;
  src?: string;
  fit: "cover" | "contain";
  opacity: number;
};

type Page = { id: string; frames: Frame[] };
type DDoc = { size: keyof typeof PAGE_SIZES; margin: number; columns: number; gutter: number; pages: Page[] };

type Drag =
  | { kind: "move"; id: string; start: Pt; orig: Frame }
  | { kind: "resize"; id: string; handle: string; orig: Frame }
  | { kind: "create"; id: string; start: Pt };

type Pt = { x: number; y: number };

const PAGE_SIZES = {
  A4: { w: 595, h: 842 },
  Letter: { w: 612, h: 792 },
  A5: { w: 420, h: 595 },
  Square: { w: 600, h: 600 },
  "Slide 16:9": { w: 960, h: 540 },
} as const;

const FONT_CSS: Record<FontKey, string> = {
  sans: "Helvetica, Arial, sans-serif",
  serif: "'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
};

const TOOLS: { id: Tool; label: string; key: string; icon: ReactNode }[] = [
  { id: "select", label: "Select", key: "V", icon: <MousePointer2 size={18} /> },
  { id: "text", label: "Text frame", key: "T", icon: <Type size={18} /> },
  { id: "image", label: "Image frame", key: "F", icon: <ImagePlus size={18} /> },
  { id: "rect", label: "Rectangle", key: "M", icon: <Square size={18} /> },
  { id: "ellipse", label: "Ellipse", key: "L", icon: <Circle size={18} /> },
  { id: "line", label: "Line", key: "\\", icon: <Minus size={18} /> },
];

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const SNAP = 5;

const LOREM =
  "Good layout is mostly invisible. The reader notices the words, the pictures and the rhythm of the page, not the grid underneath it. That grid is still doing the work: margins give the eye somewhere to rest, columns keep line lengths readable, and consistent spacing makes a page feel deliberate.\n\nDrag frames around, double-click to edit text, and export a real PDF when you're done.";

function makeFrame(type: Frame["type"], x: number, y: number, w: number, h: number, extra: Partial<Frame> = {}): Frame {
  return {
    id: uid("f"),
    type,
    x,
    y,
    w,
    h,
    text: type === "text" ? "Double-click to edit text" : "",
    font: "sans",
    size: 12,
    lineHeight: 1.4,
    color: "#0f172a",
    align: "left",
    bold: false,
    italic: false,
    fill: type === "rect" || type === "ellipse" ? "#ccfbf1" : null,
    stroke: type === "line" ? "#0f172a" : null,
    strokeWidth: 1,
    radius: 0,
    fit: "cover",
    opacity: 1,
    ...extra,
  };
}

function starterDoc(): DDoc {
  const m = 48;
  const colW = (595 - m * 2 - 18) / 2;
  return {
    size: "A4",
    margin: m,
    columns: 2,
    gutter: 18,
    pages: [
      {
        id: uid("p"),
        frames: [
          makeFrame("rect", 0, 0, 595, 250, { fill: "#0d9488" }),
          makeFrame("text", m, 72, 595 - m * 2, 90, { text: "The Quiet Grid", font: "serif", size: 44, bold: true, color: "#ffffff", lineHeight: 1.1 }),
          makeFrame("text", m, 170, 595 - m * 2, 40, { text: "Notes on page layout, made in Open Studio", size: 14, color: "#ccfbf1" }),
          makeFrame("text", m, 290, colW, 480, { text: LOREM, font: "serif", size: 11, lineHeight: 1.5 }),
          makeFrame("rect", m + colW + 18, 290, colW, 200, { fill: "#e2e8f0", radius: 6 }),
          makeFrame("text", m + colW + 18, 505, colW, 120, {
            text: "Use the image tool to place a photo, or select this grey box and press Place image to swap one in.",
            size: 10,
            italic: true,
            color: "#475569",
            lineHeight: 1.45,
          }),
          makeFrame("line", m, 790, 595 - m * 2, 0, { stroke: "#94a3b8", strokeWidth: 0.75 }),
        ],
      },
    ],
  };
}

let measureCtx: CanvasRenderingContext2D | null = null;
function cssFont(f: Frame) {
  return `${f.italic ? "italic " : ""}${f.bold ? 700 : 400} ${f.size}px ${FONT_CSS[f.font]}`;
}

/** Greedy word wrap. `measure` returns a string's width at the frame's size. */
function wrap(text: string, measure: (s: string) => number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/ +/)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (measure(tryLine) <= maxW || !line) {
        if (!line && measure(word) > maxW) {
          // Break a word that can't fit on a line by itself.
          let chunk = "";
          for (const ch of word) {
            if (measure(chunk + ch) > maxW && chunk) {
              out.push(chunk);
              chunk = ch;
            } else chunk += ch;
          }
          line = chunk;
        } else line = tryLine;
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

function editorLines(f: Frame) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx!;
  ctx.font = cssFont(f);
  return wrap(f.text, (s) => ctx.measureText(s).width, f.w);
}

function hexToRgb01(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
}

function guidesFor(doc: DDoc) {
  const { w, h } = PAGE_SIZES[doc.size];
  const xs = [0, w / 2, w, doc.margin, w - doc.margin];
  const ys = [0, h / 2, h, doc.margin, h - doc.margin];
  const colW = (w - doc.margin * 2 - doc.gutter * (doc.columns - 1)) / doc.columns;
  for (let i = 1; i < doc.columns; i++) {
    const x = doc.margin + i * colW + (i - 1) * doc.gutter;
    xs.push(x, x + doc.gutter);
  }
  return { xs, ys, colW };
}

function FrameView({ f, editing, onTextChange, onDone }: {
  f: Frame;
  editing: boolean;
  onTextChange?: (t: string) => void;
  onDone?: () => void;
}) {
  const base: CSSProperties = { position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h, opacity: f.opacity };
  if (f.type === "line") {
    const len = Math.hypot(f.w, f.h);
    const angle = (Math.atan2(f.h, f.w) * 180) / Math.PI;
    return (
      <div
        data-frame={f.id}
        style={{ position: "absolute", left: f.x, top: f.y - Math.max(3, f.strokeWidth) / 2, width: len, height: Math.max(6, f.strokeWidth), transform: `rotate(${angle}deg)`, transformOrigin: `0 ${Math.max(3, f.strokeWidth) / 2}px`, opacity: f.opacity }}
      >
        <div style={{ marginTop: Math.max(3, f.strokeWidth) / 2 - f.strokeWidth / 2, height: f.strokeWidth, background: f.stroke ?? "#000" }} />
      </div>
    );
  }
  if (f.type === "text") {
    const lines = editorLines(f);
    const lh = f.size * f.lineHeight;
    const overset = lines.length * lh > f.h + 0.5;
    const textStyle: CSSProperties = { font: cssFont(f), lineHeight: `${lh}px`, color: f.color, textAlign: f.align };
    return (
      <div data-frame={f.id} style={{ ...base, background: f.fill ?? undefined }}>
        {editing ? (
          <textarea
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={f.text}
            onChange={(e) => onTextChange?.(e.target.value)}
            onBlur={onDone}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-full w-full resize-none bg-white/70 p-0 outline outline-2 outline-teal-500"
            style={{ ...textStyle, overflow: "hidden" }}
          />
        ) : (
          <div className="h-full w-full overflow-hidden" style={textStyle}>
            {lines.map((l, i) => (
              <div key={i} style={{ height: lh, whiteSpace: "pre" }}>
                {l || " "}
              </div>
            ))}
          </div>
        )}
        {overset && !editing && (
          <span className="absolute -right-2 -bottom-2 flex h-4 w-4 items-center justify-center bg-red-500 text-[10px] font-bold text-white" title="Text doesn't fit this frame">
            +
          </span>
        )}
      </div>
    );
  }
  if (f.type === "image") {
    return (
      <div data-frame={f.id} style={{ ...base, overflow: "hidden", background: f.src ? undefined : "#e2e8f0" }}>
        {f.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: f.fit }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">Empty image frame</div>
        )}
      </div>
    );
  }
  return (
    <div
      data-frame={f.id}
      style={{
        ...base,
        background: f.fill ?? undefined,
        border: f.stroke ? `${f.strokeWidth}px solid ${f.stroke}` : undefined,
        borderRadius: f.type === "ellipse" ? "50%" : f.radius,
        boxSizing: "border-box",
      }}
    />
  );
}

export default function DesignApp() {
  const hist = useHistory<DDoc>(starterDoc);
  const doc = hist.state;
  const [pageIdx, setPageIdx] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const [zoom, setZoom] = useState(0.9);
  const [showGuides, setShowGuides] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const placeTarget = useRef<string | null>(null);

  const size = PAGE_SIZES[doc.size];
  const page = doc.pages[Math.min(pageIdx, doc.pages.length - 1)];
  const sel = page.frames.find((f) => f.id === selected) ?? null;
  const guides = guidesFor(doc);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const ws = wsRef.current;
      if (ws) setZoom(clamp(Math.min((ws.clientWidth - 48) / size.w, (ws.clientHeight - 48) / size.h), 0.2, 3));
    });
    return () => cancelAnimationFrame(id);
  }, [size.w, size.h]);

  function setFrames(fn: (frames: Frame[]) => Frame[], commit = true) {
    hist.set((d) => ({ ...d, pages: d.pages.map((p) => (p.id === page.id ? { ...p, frames: fn(p.frames) } : p)) }), commit);
  }

  function patchFrame(id: string, patch: Partial<Frame>, commit = true) {
    setFrames((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)), commit);
  }

  function toPt(e: { clientX: number; clientY: number }): Pt {
    const r = pageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  }

  /** Snaps a value to the nearest guide or frame edge. */
  function snapAxis(values: number[], targets: number[]) {
    let best: { d: number; delta: number; at: number } | null = null;
    for (const v of values)
      for (const t of targets) {
        const d = Math.abs(v - t);
        if (d < SNAP / zoom && (!best || d < best.d)) best = { d, delta: t - v, at: t };
      }
    return best;
  }

  function snapTargets(ignore: string) {
    const xs = [...guides.xs];
    const ys = [...guides.ys];
    page.frames.forEach((f) => {
      if (f.id === ignore) return;
      xs.push(f.x, f.x + f.w, f.x + f.w / 2);
      ys.push(f.y, f.y + f.h, f.y + f.h / 2);
    });
    return { xs, ys };
  }

  function onPageDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button > 0 || editing) return;
    const p = toPt(e);
    const target = e.target as HTMLElement;
    const handle = target.closest("[data-handle]")?.getAttribute("data-handle");
    const frameId = target.closest("[data-frame]")?.getAttribute("data-frame");
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "select") {
      if (handle && sel) {
        setDrag({ kind: "resize", id: sel.id, handle, orig: sel });
        return;
      }
      const f = frameId ? page.frames.find((x) => x.id === frameId) : undefined;
      setSelected(f?.id ?? null);
      if (f) setDrag({ kind: "move", id: f.id, start: p, orig: f });
      return;
    }
    const type = tool === "image" ? "image" : tool;
    const f = makeFrame(type, p.x, p.y, 0, 0);
    setFrames((fs) => [...fs, f], false);
    setSelected(f.id);
    setDrag({ kind: "create", id: f.id, start: p });
  }

  function onPageMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const p = toPt(e);
    if (drag.kind === "move") {
      const o = drag.orig;
      let x = o.x + p.x - drag.start.x;
      let y = o.y + p.y - drag.start.y;
      const t = snapTargets(o.id);
      const sx = snapAxis([x, x + o.w, x + o.w / 2], t.xs);
      const sy = snapAxis([y, y + o.h, y + o.h / 2], t.ys);
      if (sx) x += sx.delta;
      if (sy) y += sy.delta;
      setSnapLines({ x: sx?.at, y: sy?.at });
      patchFrame(o.id, { x, y }, false);
    } else if (drag.kind === "resize") {
      const o = drag.orig;
      const t = snapTargets(o.id);
      const snapX = (v: number) => {
        const s = snapAxis([v], t.xs);
        return s ? s.at : v;
      };
      const snapY = (v: number) => {
        const s = snapAxis([v], t.ys);
        return s ? s.at : v;
      };
      let x0 = o.x;
      let y0 = o.y;
      let x1 = o.x + o.w;
      let y1 = o.y + o.h;
      if (drag.handle.includes("w")) x0 = snapX(p.x);
      if (drag.handle.includes("e")) x1 = snapX(p.x);
      if (drag.handle.includes("n")) y0 = snapY(p.y);
      if (drag.handle.includes("s")) y1 = snapY(p.y);
      if (o.type === "line") patchFrame(o.id, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, false);
      else patchFrame(o.id, { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(4, Math.abs(x1 - x0)), h: Math.max(4, Math.abs(y1 - y0)) }, false);
    } else {
      const { start } = drag;
      const f = page.frames.find((x) => x.id === drag.id);
      if (f?.type === "line") patchFrame(drag.id, { w: p.x - start.x, h: e.shiftKey ? 0 : p.y - start.y }, false);
      else patchFrame(drag.id, { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }, false);
    }
  }

  function onPageUp() {
    if (!drag) return;
    if (drag.kind === "create") {
      const f = page.frames.find((x) => x.id === drag.id);
      if (f && f.type !== "line" && (f.w < 8 || f.h < 8)) {
        // A click places a column-wide default frame.
        patchFrame(f.id, { w: guides.colW, h: f.type === "text" ? 120 : guides.colW * 0.66 });
      } else if (f?.type === "line" && Math.hypot(f.w, f.h) < 8) {
        patchFrame(f.id, { w: guides.colW });
      } else hist.commit();
      if (f?.type === "image") {
        placeTarget.current = f.id;
        fileRef.current?.click();
      }
      if (f?.type === "text") setEditing(f.id);
      setTool("select");
    } else hist.commit();
    setDrag(null);
    setSnapLines({});
  }

  async function onPlaceFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const src = await readAsDataURL(file);
      const img = await loadImage(src);
      const target = placeTarget.current ? page.frames.find((f) => f.id === placeTarget.current) : null;
      placeTarget.current = null;
      if (target) {
        patchFrame(target.id, { type: "image", src, fill: null, stroke: null });
      } else {
        const w = Math.min(guides.colW * 2, img.naturalWidth);
        const h = (w * img.naturalHeight) / img.naturalWidth;
        const f = makeFrame("image", doc.margin, doc.margin, w, h, { src });
        setFrames((fs) => [...fs, f]);
        setSelected(f.id);
      }
    } catch {
      setError("Couldn't read that image.");
    }
  }

  function placeImage() {
    placeTarget.current = sel && (sel.type === "image" || sel.type === "rect") ? sel.id : null;
    fileRef.current?.click();
  }

  // ---------- pages ----------

  function addPage(copyOf?: Page) {
    const p: Page = copyOf ? { id: uid("p"), frames: copyOf.frames.map((f) => ({ ...f, id: uid("f") })) } : { id: uid("p"), frames: [] };
    const at = pageIdx + 1;
    hist.set((d) => {
      const pages = [...d.pages];
      pages.splice(at, 0, p);
      return { ...d, pages };
    });
    setPageIdx(at);
    setSelected(null);
  }

  function deletePage() {
    if (doc.pages.length < 2) return;
    hist.set((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== page.id) }));
    setPageIdx((i) => Math.max(0, i - 1));
    setSelected(null);
  }

  function movePage(dir: 1 | -1) {
    const j = pageIdx + dir;
    if (j < 0 || j >= doc.pages.length) return;
    hist.set((d) => {
      const pages = [...d.pages];
      [pages[pageIdx], pages[j]] = [pages[j], pages[pageIdx]];
      return { ...d, pages };
    });
    setPageIdx(j);
  }

  function arrange(front: boolean) {
    if (!sel) return;
    setFrames((fs) => {
      const rest = fs.filter((f) => f.id !== sel.id);
      return front ? [...rest, sel] : [sel, ...rest];
    });
  }

  function duplicate() {
    if (!sel) return;
    const copy = { ...sel, id: uid("f"), x: sel.x + 12, y: sel.y + 12 };
    setFrames((fs) => [...fs, copy]);
    setSelected(copy.id);
  }

  function remove() {
    if (!sel) return;
    setFrames((fs) => fs.filter((f) => f.id !== sel.id));
    setSelected(null);
  }

  // ---------- PDF export ----------

  async function exportPdf() {
    setBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      pdf.setTitle("Open Studio layout");
      pdf.setCreator("Open Studio · Design");
      const fontNames: Record<FontKey, string[]> = {
        sans: [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique],
        serif: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic],
        mono: [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique],
      };
      const fontCache = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();
      const getFont = async (f: Frame) => {
        const name = fontNames[f.font][(f.bold ? 1 : 0) + (f.italic ? 2 : 0)];
        if (!fontCache.has(name)) fontCache.set(name, await pdf.embedFont(name));
        return fontCache.get(name)!;
      };
      const color = (hex: string) => rgb(...hexToRgb01(hex));
      const { w: W, h: H } = size;

      for (const pg of doc.pages) {
        const p = pdf.addPage([W, H]);
        for (const f of pg.frames) {
          const y = H - f.y - f.h;
          if (f.type === "rect" || (f.type === "text" && f.fill)) {
            const r = Math.min(f.radius, f.w / 2, f.h / 2);
            const d = r
              ? `M${r} 0H${f.w - r}Q${f.w} 0 ${f.w} ${r}V${f.h - r}Q${f.w} ${f.h} ${f.w - r} ${f.h}H${r}Q0 ${f.h} 0 ${f.h - r}V${r}Q0 0 ${r} 0Z`
              : `M0 0H${f.w}V${f.h}H0Z`;
            p.drawSvgPath(d, {
              x: f.x,
              y: H - f.y,
              color: f.fill ? color(f.fill) : undefined,
              borderColor: f.stroke && f.type === "rect" ? color(f.stroke) : undefined,
              borderWidth: f.stroke && f.type === "rect" ? f.strokeWidth : 0,
              opacity: f.opacity,
              borderOpacity: f.opacity,
            });
          }
          if (f.type === "ellipse") {
            p.drawEllipse({
              x: f.x + f.w / 2,
              y: H - f.y - f.h / 2,
              xScale: f.w / 2,
              yScale: f.h / 2,
              color: f.fill ? color(f.fill) : undefined,
              borderColor: f.stroke ? color(f.stroke) : undefined,
              borderWidth: f.stroke ? f.strokeWidth : 0,
              opacity: f.opacity,
            });
          } else if (f.type === "line") {
            p.drawLine({ start: { x: f.x, y: H - f.y }, end: { x: f.x + f.w, y: H - f.y - f.h }, thickness: f.strokeWidth, color: color(f.stroke ?? "#000000"), opacity: f.opacity });
          } else if (f.type === "image" && f.src) {
            const img = await loadImage(f.src);
            // Bake cover/contain cropping into the embedded image.
            const scale = 2;
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(f.w * scale));
            c.height = Math.max(1, Math.round(f.h * scale));
            const ctx = c.getContext("2d")!;
            const fit = (f.fit === "cover" ? Math.max : Math.min)(c.width / img.naturalWidth, c.height / img.naturalHeight);
            const dw = img.naturalWidth * fit;
            const dh = img.naturalHeight * fit;
            ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
            const png = f.src.startsWith("data:image/png") || f.fit === "contain";
            const bytes = await (await fetch(c.toDataURL(png ? "image/png" : "image/jpeg", 0.9))).arrayBuffer();
            const embedded = png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
            p.drawImage(embedded, { x: f.x, y, width: f.w, height: f.h, opacity: f.opacity });
          } else if (f.type === "text") {
            const font = await getFont(f);
            const safe = (s: string) =>
              Array.from(s)
                .map((ch) => {
                  try {
                    font.widthOfTextAtSize(ch, f.size);
                    return ch;
                  } catch {
                    return "?";
                  }
                })
                .join("");
            const lines = wrap(safe(f.text), (s) => font.widthOfTextAtSize(s, f.size), f.w);
            const lh = f.size * f.lineHeight;
            lines.forEach((line, i) => {
              if ((i + 1) * lh > f.h + 0.5) return;
              const lw = font.widthOfTextAtSize(line, f.size);
              const lx = f.align === "center" ? f.x + (f.w - lw) / 2 : f.align === "right" ? f.x + f.w - lw : f.x;
              // Centre the glyphs in the line box the way CSS line-height does.
              const baseline = f.y + i * lh + (lh - f.size) / 2 + f.size * 0.8;
              p.drawText(line, { x: lx, y: H - baseline, size: f.size, font, color: color(f.color), opacity: f.opacity });
            });
          }
        }
      }
      const bytes = await pdf.save();
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), "layout.pdf");
    } catch (err) {
      console.error(err);
      setError("PDF export failed.");
    } finally {
      setBusy(false);
    }
  }

  useKeys((e) => {
    if (editing) return;
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicate();
      return;
    }
    if (mod) return;
    if ((e.key === "Delete" || e.key === "Backspace") && sel) {
      e.preventDefault();
      remove();
    } else if (e.key === "Enter" && sel?.type === "text") {
      e.preventDefault();
      setEditing(sel.id);
    } else if (e.key.startsWith("Arrow") && sel) {
      e.preventDefault();
      const s = e.shiftKey ? 10 : 1;
      patchFrame(sel.id, {
        x: sel.x + (e.key === "ArrowLeft" ? -s : e.key === "ArrowRight" ? s : 0),
        y: sel.y + (e.key === "ArrowUp" ? -s : e.key === "ArrowDown" ? s : 0),
      });
    } else if (e.key === "Escape") setSelected(null);
    else {
      const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (t) setTool(t.id);
    }
  });

  const iconBtn = `${btn} px-2`;
  const thumbScale = 120 / size.w;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPlaceFile} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Design" replaces="InDesign" blurb="Multi-page layouts with margins, columns and snapping. Exports a real, text-selectable PDF.">
          <button className={btn} onClick={placeImage}>
            <ImagePlus size={14} /> Place image
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo">
            <Undo2 size={14} />
          </button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo">
            <Redo2 size={14} />
          </button>
          <button className={btnPrimary} disabled={busy} onClick={exportPdf}>
            <Download size={14} /> {busy ? "Exporting…" : "Export PDF"}
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div className="grid gap-3 lg:grid-cols-[52px_150px_minmax(0,1fr)_280px]">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-1.5 lg:flex-col">
            {TOOLS.map((t) => (
              <button key={t.id} title={`${t.label} (${t.key})`} aria-label={t.label} aria-pressed={tool === t.id} onClick={() => setTool(t.id)} className={toolBtnCls(tool === t.id)}>
                {t.icon}
              </button>
            ))}
          </nav>

          <div className="flex gap-2 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-2 lg:max-h-[calc(100vh-200px)] lg:flex-col">
            {doc.pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  setPageIdx(i);
                  setSelected(null);
                }}
                className={`shrink-0 rounded border-2 p-1 text-center ${i === pageIdx ? "border-accent" : "border-transparent hover:border-slate-600"}`}
              >
                <div className="relative mx-auto overflow-hidden bg-white" style={{ width: size.w * thumbScale, height: size.h * thumbScale }}>
                  <div className="pointer-events-none absolute top-0 left-0" style={{ width: size.w, height: size.h, transform: `scale(${thumbScale})`, transformOrigin: "0 0" }}>
                    {p.frames.map((f) => (
                      <FrameView key={f.id} f={f} editing={false} />
                    ))}
                  </div>
                </div>
                <span className="mt-1 block text-[10px] text-slate-400">{i + 1}</span>
              </button>
            ))}
            <div className="flex shrink-0 flex-wrap justify-center gap-1 lg:flex-col">
              <button className={btn} onClick={() => addPage()}>
                <FilePlus size={14} /> Page
              </button>
              <button className={btn} onClick={() => addPage(page)}>
                <Copy size={14} /> Duplicate
              </button>
              <div className="flex gap-1">
                <button className={iconBtn} onClick={() => movePage(-1)} title="Move page up"><ArrowUp size={14} /></button>
                <button className={iconBtn} onClick={() => movePage(1)} title="Move page down"><ArrowDown size={14} /></button>
                <button className={iconBtn} disabled={doc.pages.length < 2} onClick={deletePage} title="Delete page"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1.5">
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z / 1.2, 0.2, 4))} title="Zoom out"><ZoomOut size={14} /></button>
              <span className="w-12 text-center font-mono text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z * 1.2, 0.2, 4))} title="Zoom in"><ZoomIn size={14} /></button>
              <label className="ml-2 flex items-center gap-1.5 text-xs text-slate-400">
                <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} className="accent-teal-500" /> Guides
              </label>
              <span className="ml-auto font-mono text-[11px] text-slate-500">
                Page {pageIdx + 1} of {doc.pages.length} · {doc.size}
              </span>
            </div>
            <div ref={wsRef} className="flex h-[65vh] overflow-auto bg-[#0A0D12] lg:h-[calc(100vh-240px)]">
              <div className="m-auto p-6">
                <div style={{ width: size.w * zoom, height: size.h * zoom }} className="relative shadow-2xl shadow-black/60">
                  <div
                    ref={pageRef}
                    onPointerDown={onPageDown}
                    onPointerMove={onPageMove}
                    onPointerUp={onPageUp}
                    onDoubleClick={(e) => {
                      const id = (e.target as HTMLElement).closest("[data-frame]")?.getAttribute("data-frame");
                      const f = page.frames.find((x) => x.id === id);
                      if (f?.type === "text") setEditing(f.id);
                      if (f?.type === "image") {
                        placeTarget.current = f.id;
                        fileRef.current?.click();
                      }
                    }}
                    className="absolute top-0 left-0 touch-none bg-white select-none"
                    style={{ width: size.w, height: size.h, transform: `scale(${zoom})`, transformOrigin: "0 0", cursor: tool === "select" ? "default" : "crosshair" }}
                  >
                    {showGuides && (
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute border border-fuchsia-400/60" style={{ left: doc.margin, top: doc.margin, right: doc.margin, bottom: doc.margin }} />
                        {guides.xs.slice(5).map((x, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-sky-400/50" style={{ left: x, top: doc.margin, bottom: doc.margin }} />
                        ))}
                      </div>
                    )}
                    {page.frames.map((f) => (
                      <FrameView
                        key={f.id}
                        f={f}
                        editing={editing === f.id}
                        onTextChange={(t) => patchFrame(f.id, { text: t }, false)}
                        onDone={() => {
                          hist.commit();
                          setEditing(null);
                        }}
                      />
                    ))}
                    {snapLines.x !== undefined && <div className="pointer-events-none absolute top-0 bottom-0 border-l border-pink-500" style={{ left: snapLines.x }} />}
                    {snapLines.y !== undefined && <div className="pointer-events-none absolute right-0 left-0 border-t border-pink-500" style={{ top: snapLines.y }} />}
                    {sel && !editing && (
                      <div className="pointer-events-none absolute" style={{ left: Math.min(sel.x, sel.x + sel.w), top: Math.min(sel.y, sel.y + sel.h), width: Math.abs(sel.w), height: Math.abs(sel.h) }}>
                        <div className="absolute inset-0 outline outline-teal-500" style={{ outlineWidth: 1 / zoom }} />
                        {tool === "select" &&
                          HANDLES.filter((h) => sel.type !== "line" || h === "nw" || h === "se").map((h) => (
                            <div
                              key={h}
                              data-handle={h}
                              className="pointer-events-auto absolute border border-teal-600 bg-white"
                              style={{
                                width: 8 / zoom,
                                height: 8 / zoom,
                                left: `calc(${h.includes("w") ? 0 : h.includes("e") ? 100 : 50}% - ${4 / zoom}px)`,
                                top: `calc(${h.includes("n") ? 0 : h.includes("s") ? 100 : 50}% - ${4 / zoom}px)`,
                                cursor: `${h}-resize`,
                              }}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
            {sel ? (
              <Panel title={`${sel.type[0].toUpperCase()}${sel.type.slice(1)} frame`}>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["x", "y", "w", "h"] as const).map((k) => (
                      <label key={k} className="flex flex-col gap-1">
                        <span className={labelCls}>{k.toUpperCase()}</span>
                        <input type="number" className={`${inputCls} w-full px-1.5`} value={Math.round(sel[k])} onChange={(e) => Number.isFinite(Number(e.target.value)) && patchFrame(sel.id, { [k]: Number(e.target.value) })} />
                      </label>
                    ))}
                  </div>
                  {sel.type === "text" && (
                    <>
                      <textarea className={inputCls} rows={4} value={sel.text} onChange={(e) => patchFrame(sel.id, { text: e.target.value }, false)} />
                      <div className="flex gap-2">
                        <select className={`${inputCls} flex-1`} value={sel.font} onChange={(e) => patchFrame(sel.id, { font: e.target.value as FontKey })}>
                          <option value="sans">Helvetica</option>
                          <option value="serif">Times</option>
                          <option value="mono">Courier</option>
                        </select>
                        <button className={`${iconBtn} font-bold ${sel.bold ? "border-accent text-white" : ""}`} onClick={() => patchFrame(sel.id, { bold: !sel.bold })}>B</button>
                        <button className={`${iconBtn} italic ${sel.italic ? "border-accent text-white" : ""}`} onClick={() => patchFrame(sel.id, { italic: !sel.italic })}>I</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={sel.color} onChange={(e) => patchFrame(sel.id, { color: e.target.value }, false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Text color" />
                        {(["left", "center", "right"] as const).map((a) => (
                          <button key={a} className={`${iconBtn} ${sel.align === a ? "border-accent text-white" : ""}`} onClick={() => patchFrame(sel.id, { align: a })} aria-label={`Align ${a}`}>
                            {a === "left" ? <AlignLeft size={14} /> : a === "center" ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                          </button>
                        ))}
                      </div>
                      <Slider label="Size" value={sel.size} min={6} max={120} step={0.5} unit="pt" onChange={(v) => patchFrame(sel.id, { size: v }, false)} />
                      <Slider label="Leading" value={sel.lineHeight} min={0.8} max={2.5} step={0.05} unit="×" onChange={(v) => patchFrame(sel.id, { lineHeight: v }, false)} />
                    </>
                  )}
                  {sel.type === "image" && (
                    <div className="flex gap-2">
                      <select className={`${inputCls} flex-1`} value={sel.fit} onChange={(e) => patchFrame(sel.id, { fit: e.target.value as Frame["fit"] })}>
                        <option value="cover">Fill frame</option>
                        <option value="contain">Fit content</option>
                      </select>
                      <button className={btn} onClick={placeImage}>Replace</button>
                    </div>
                  )}
                  {sel.type !== "image" && sel.type !== "line" && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300">
                        <input type="checkbox" checked={!!sel.fill} onChange={(e) => patchFrame(sel.id, { fill: e.target.checked ? "#ccfbf1" : null })} className="accent-teal-500" /> Fill
                      </label>
                      {sel.fill && <input type="color" value={sel.fill} onChange={(e) => patchFrame(sel.id, { fill: e.target.value }, false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Fill" />}
                    </div>
                  )}
                  {(sel.type === "rect" || sel.type === "ellipse" || sel.type === "line") && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-300">
                          <input type="checkbox" checked={!!sel.stroke} onChange={(e) => patchFrame(sel.id, { stroke: e.target.checked ? "#0f172a" : null })} className="accent-teal-500" /> Stroke
                        </label>
                        {sel.stroke && <input type="color" value={sel.stroke} onChange={(e) => patchFrame(sel.id, { stroke: e.target.value }, false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Stroke" />}
                      </div>
                      <Slider label="Stroke width" value={sel.strokeWidth} min={0.25} max={20} step={0.25} unit="pt" onChange={(v) => patchFrame(sel.id, { strokeWidth: v }, false)} />
                    </>
                  )}
                  {sel.type === "rect" && <Slider label="Corner radius" value={sel.radius} min={0} max={100} unit="pt" onChange={(v) => patchFrame(sel.id, { radius: v }, false)} />}
                  <Slider label="Opacity" value={Math.round(sel.opacity * 100)} min={0} max={100} unit="%" onChange={(v) => patchFrame(sel.id, { opacity: v / 100 }, false)} />
                  <div className="flex flex-wrap gap-1">
                    <button className={iconBtn} onClick={() => arrange(true)} title="Bring to front"><BringToFront size={14} /></button>
                    <button className={iconBtn} onClick={() => arrange(false)} title="Send to back"><SendToBack size={14} /></button>
                    <button className={btn} onClick={() => patchFrame(sel.id, { x: (size.w - sel.w) / 2 })}>Center H</button>
                    <button className={iconBtn} onClick={duplicate} title="Duplicate"><Copy size={14} /></button>
                    <button className={iconBtn} onClick={remove} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              </Panel>
            ) : (
              <Panel title="Document setup">
                <div className="flex flex-col gap-3">
                  <select className={inputCls} value={doc.size} onChange={(e) => hist.set((d) => ({ ...d, size: e.target.value as DDoc["size"] }))}>
                    {Object.keys(PAGE_SIZES).map((k) => (
                      <option key={k} value={k}>
                        {k} ({PAGE_SIZES[k as DDoc["size"]].w} × {PAGE_SIZES[k as DDoc["size"]].h} pt)
                      </option>
                    ))}
                  </select>
                  <Slider label="Margins" value={doc.margin} min={0} max={144} unit="pt" onChange={(v) => hist.set((d) => ({ ...d, margin: v }), false)} />
                  <Slider label="Columns" value={doc.columns} min={1} max={6} onChange={(v) => hist.set((d) => ({ ...d, columns: v }), false)} />
                  <Slider label="Gutter" value={doc.gutter} min={0} max={48} unit="pt" onChange={(v) => hist.set((d) => ({ ...d, gutter: v }), false)} />
                  <p className="text-xs text-slate-500">
                    Draw frames with the tools on the left. Frames snap to margins, columns and each other. Double-click a text frame to type.
                  </p>
                </div>
              </Panel>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
