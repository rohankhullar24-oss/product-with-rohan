"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Check,
  Copy,
  Crop,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FilePlus,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  ImagePlus,
  Layers,
  Maximize,
  Move,
  Pipette,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AppHeader } from "./shared";

// Everything runs on <canvas> in the browser: no uploads, no backend.
//
// Each layer owns an offscreen canvas. Layer canvases are copy-on-write:
// an edit never draws into an existing layer canvas, it builds a new one and
// swaps it in. That lets undo history keep cheap shallow snapshots that share
// every canvas an edit didn't touch.

type Tool = "move" | "brush" | "eraser" | "text" | "crop" | "picker";

type Adjust = {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
};

type Layer = {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
  blend: GlobalCompositeOperation;
  adjust: Adjust;
};

type Doc = { width: number; height: number; layers: Layer[]; activeId: string };

type Rect = { x: number; y: number; w: number; h: number };

type Stroke = {
  layerId: string;
  base: HTMLCanvasElement;
  buffer: HTMLCanvasElement;
  live: HTMLCanvasElement;
  erase: boolean;
  last: { x: number; y: number };
};

type CommitMode = "commit" | "soon" | "none";

const MAX_DIM = 4096;
const MAX_HISTORY = 40;

const NEUTRAL: Adjust = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};

const ADJUST_SLIDERS: { key: keyof Adjust; label: string; min: number; max: number; unit: string }[] = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
  { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
  { key: "saturate", label: "Saturation", min: 0, max: 300, unit: "%" },
  { key: "hue", label: "Hue", min: -180, max: 180, unit: "°" },
  { key: "blur", label: "Blur", min: 0, max: 20, unit: "px" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%" },
  { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
  { key: "invert", label: "Invert", min: 0, max: 100, unit: "%" },
];

const PRESETS: { name: string; adjust: Partial<Adjust> }[] = [
  { name: "Original", adjust: {} },
  { name: "Vivid", adjust: { saturate: 150, contrast: 112 } },
  { name: "Noir", adjust: { grayscale: 100, contrast: 130, brightness: 95 } },
  { name: "Vintage", adjust: { sepia: 55, contrast: 90, saturate: 80, brightness: 105 } },
  { name: "Fade", adjust: { contrast: 80, brightness: 112, saturate: 70 } },
  { name: "Cool", adjust: { hue: -15, saturate: 110, brightness: 102 } },
  { name: "Warm", adjust: { sepia: 25, saturate: 120, hue: -5 } },
  { name: "Invert", adjust: { invert: 100 } },
];

const BLEND_MODES: { value: GlobalCompositeOperation; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color dodge" },
  { value: "color-burn", label: "Color burn" },
  { value: "hard-light", label: "Hard light" },
  { value: "soft-light", label: "Soft light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Color" },
  { value: "luminosity", label: "Luminosity" },
];

const FONTS: { label: string; css: string }[] = [
  { label: "Sans", css: "system-ui, -apple-system, Segoe UI, Arial, sans-serif" },
  { label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", css: "ui-monospace, Menlo, Consolas, monospace" },
  { label: "Impact", css: "Impact, 'Arial Black', sans-serif" },
];

const TOOLS: { id: Tool; label: string; key: string; icon: ReactNode }[] = [
  { id: "move", label: "Move", key: "V", icon: <Move size={18} /> },
  { id: "brush", label: "Brush", key: "B", icon: <Brush size={18} /> },
  { id: "eraser", label: "Eraser", key: "E", icon: <Eraser size={18} /> },
  { id: "text", label: "Text", key: "T", icon: <Type size={18} /> },
  { id: "crop", label: "Crop", key: "C", icon: <Crop size={18} /> },
  { id: "picker", label: "Eyedropper", key: "I", icon: <Pipette size={18} /> },
];

const CHECKERBOARD = "repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%) 50% / 16px 16px";

let idSeq = 0;
const newId = () => `layer-${++idSeq}`;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext("2d", { willReadFrequently: false })!;
}

function filterString(a: Adjust): string {
  const parts: string[] = [];
  if (a.brightness !== 100) parts.push(`brightness(${a.brightness}%)`);
  if (a.contrast !== 100) parts.push(`contrast(${a.contrast}%)`);
  if (a.saturate !== 100) parts.push(`saturate(${a.saturate}%)`);
  if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.blur !== 0) parts.push(`blur(${a.blur}px)`);
  if (a.grayscale !== 0) parts.push(`grayscale(${a.grayscale}%)`);
  if (a.sepia !== 0) parts.push(`sepia(${a.sepia}%)`);
  if (a.invert !== 0) parts.push(`invert(${a.invert}%)`);
  return parts.length ? parts.join(" ") : "none";
}

function makeLayer(name: string, canvas: HTMLCanvasElement, x = 0, y = 0): Layer {
  return {
    id: newId(),
    name,
    canvas,
    x,
    y,
    opacity: 1,
    visible: true,
    blend: "source-over",
    adjust: { ...NEUTRAL },
  };
}

function snapshot(d: Doc): Doc {
  return { ...d, layers: d.layers.map((l) => ({ ...l, adjust: { ...l.adjust } })) };
}

function composite(
  target: CanvasRenderingContext2D,
  d: Doc,
  live?: { layerId: string; source: HTMLCanvasElement },
) {
  target.save();
  for (const l of d.layers) {
    if (!l.visible) continue;
    target.globalAlpha = l.opacity;
    target.globalCompositeOperation = l.blend;
    target.filter = filterString(l.adjust);
    target.drawImage(live && live.layerId === l.id ? live.source : l.canvas, l.x, l.y);
  }
  target.restore();
}

function mergeStrokeInto(
  out: HTMLCanvasElement,
  base: HTMLCanvasElement,
  stroke: HTMLCanvasElement,
  opacity: number,
  erase: boolean,
) {
  const c = ctx2d(out);
  c.save();
  c.clearRect(0, 0, out.width, out.height);
  c.drawImage(base, 0, 0);
  c.globalAlpha = opacity;
  c.globalCompositeOperation = erase ? "destination-out" : "source-over";
  c.drawImage(stroke, 0, 0);
  c.restore();
}

async function loadImageCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const c = makeCanvas(bmp.width * scale, bmp.height * scale);
  ctx2d(c).drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

function makeTextCanvas(text: string, size: number, color: string, family: string, bold: boolean) {
  const font = `${bold ? 700 : 400} ${size}px ${family}`;
  const lines = text.split("\n");
  const measure = ctx2d(makeCanvas(1, 1));
  measure.font = font;
  const pad = Math.ceil(size * 0.2);
  const lineH = Math.ceil(size * 1.25);
  const width = Math.max(...lines.map((l) => measure.measureText(l).width)) + pad * 2;
  const c = makeCanvas(width, lineH * lines.length + pad * 2);
  const ctx = ctx2d(c);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + i * lineH + (lineH - size) / 2));
  return c;
}

function normalizeRect(r: Rect, d: Doc): Rect {
  const x0 = Math.max(0, Math.min(r.x, r.x + r.w));
  const y0 = Math.max(0, Math.min(r.y, r.y + r.h));
  const x1 = Math.min(d.width, Math.max(r.x, r.x + r.w));
  const y1 = Math.min(d.height, Math.max(r.y, r.y + r.h));
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

function isTypingTarget(t: EventTarget | null) {
  return (
    t instanceof HTMLElement &&
    (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)
  );
}

export default function PhotoApp() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [zoom, setZoom] = useState(1);
  const [brushColor, setBrushColor] = useState("#0d9488");
  const [brushSize, setBrushSize] = useState(24);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [text, setText] = useState("Hello");
  const [fontSize, setFontSize] = useState(72);
  const [fontIdx, setFontIdx] = useState(0);
  const [bold, setBold] = useState(true);
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [histInfo, setHistInfo] = useState({ undo: false, redo: false });
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const openInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);

  // Event handlers read these instead of state so pointer moves never see a
  // stale document between renders.
  const docRef = useRef<Doc | null>(null);
  const strokeRef = useRef<Stroke | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const cropRef = useRef<Rect | null>(null);
  const histRef = useRef<{ stack: Doc[]; index: number }>({ stack: [], index: -1 });
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const optsRef = useRef({ tool, zoom, brushOpacity });
  const shortcutsRef = useRef<{ undo: () => void; redo: () => void; addFile: (f: File) => void }>(null);

  const active = doc?.layers.find((l) => l.id === doc.activeId) ?? null;

  // ---------- history ----------

  function syncHist() {
    const h = histRef.current;
    setHistInfo({ undo: h.index > 0, redo: h.index < h.stack.length - 1 });
  }

  function pushHistory(d: Doc) {
    const h = histRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snapshot(d));
    if (h.stack.length > MAX_HISTORY) h.stack.shift();
    h.index = h.stack.length - 1;
    syncHist();
  }

  function flushPendingCommit() {
    if (commitTimer.current && docRef.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
      pushHistory(docRef.current);
    }
  }

  function update(next: Doc, mode: CommitMode = "commit") {
    docRef.current = next;
    setDoc(next);
    if (mode === "commit") {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = null;
      pushHistory(next);
    } else if (mode === "soon") {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => {
        commitTimer.current = null;
        if (docRef.current) pushHistory(docRef.current);
      }, 400);
    }
  }

  function restore(index: number) {
    const h = histRef.current;
    h.index = index;
    const d = snapshot(h.stack[index]);
    docRef.current = d;
    setDoc(d);
    cancelCrop();
    syncHist();
  }

  function undo() {
    flushPendingCommit();
    if (histRef.current.index > 0) restore(histRef.current.index - 1);
  }

  function redo() {
    flushPendingCommit();
    const h = histRef.current;
    if (h.index < h.stack.length - 1) restore(h.index + 1);
  }

  function startDoc(d: Doc) {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = null;
    histRef.current = { stack: [], index: -1 };
    cancelCrop();
    setError(null);
    update(d);
    fitZoom(d);
  }

  // ---------- rendering ----------

  function paint() {
    frameRef.current = null;
    const cv = canvasRef.current;
    const d = docRef.current;
    if (!cv || !d) return;
    const c = ctx2d(cv);
    c.clearRect(0, 0, cv.width, cv.height);

    let live: { layerId: string; source: HTMLCanvasElement } | undefined;
    const s = strokeRef.current;
    if (s) {
      mergeStrokeInto(s.live, s.base, s.buffer, optsRef.current.brushOpacity, s.erase);
      live = { layerId: s.layerId, source: s.live };
    }
    composite(c, d, live);

    const { tool: t, zoom: z } = optsRef.current;
    const px = 1 / z;
    const layer = d.layers.find((l) => l.id === d.activeId);
    if (t === "move" && layer) {
      c.save();
      c.strokeStyle = "#14b8a6";
      c.lineWidth = 1.5 * px;
      c.setLineDash([6 * px, 4 * px]);
      c.strokeRect(layer.x, layer.y, layer.canvas.width, layer.canvas.height);
      c.restore();
    }
    const r = cropRef.current;
    if (t === "crop" && r) {
      const n = normalizeRect(r, d);
      c.save();
      c.fillStyle = "rgba(2, 6, 23, 0.55)";
      c.beginPath();
      c.rect(0, 0, d.width, d.height);
      c.rect(n.x, n.y, n.w, n.h);
      c.fill("evenodd");
      c.strokeStyle = "#fff";
      c.lineWidth = 1.5 * px;
      c.setLineDash([6 * px, 4 * px]);
      c.strokeRect(n.x, n.y, n.w, n.h);
      c.restore();
    }
  }

  function schedulePaint() {
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(paint);
  }

  useEffect(() => {
    optsRef.current = { tool, zoom, brushOpacity };
    shortcutsRef.current = { undo, redo, addFile };
    paint();
  });

  // ---------- zoom ----------

  function fitZoom(d: Doc | null = docRef.current) {
    const ws = workspaceRef.current;
    if (!d || !ws) return;
    const z = Math.min(1, (ws.clientWidth - 32) / d.width, (ws.clientHeight - 32) / d.height);
    setZoom(Math.max(0.05, z));
  }

  function zoomBy(f: number) {
    setZoom((z) => Math.min(8, Math.max(0.05, z * f)));
  }

  // ---------- files ----------

  async function openFile(file: Blob, name = "Background") {
    try {
      const c = await loadImageCanvas(file);
      const layer = makeLayer(name, c);
      startDoc({ width: c.width, height: c.height, layers: [layer], activeId: layer.id });
    } catch {
      setError("Couldn't read that file. Try a PNG, JPG, WebP or GIF.");
    }
  }

  async function addImageLayer(file: Blob, name = "Image") {
    const d = docRef.current;
    if (!d) return openFile(file, name);
    try {
      let c = await loadImageCanvas(file);
      const fit = Math.min(1, d.width / c.width, d.height / c.height);
      if (fit < 1) {
        const scaled = makeCanvas(c.width * fit, c.height * fit);
        ctx2d(scaled).drawImage(c, 0, 0, scaled.width, scaled.height);
        c = scaled;
      }
      const layer = makeLayer(name, c, Math.round((d.width - c.width) / 2), Math.round((d.height - c.height) / 2));
      insertLayer(d, layer);
    } catch {
      setError("Couldn't read that file. Try a PNG, JPG, WebP or GIF.");
    }
  }

  function addFile(file: File) {
    if (docRef.current) addImageLayer(file, file.name);
    else openFile(file, file.name);
  }

  function newBlank() {
    const c = makeCanvas(1600, 1000);
    const ctx = ctx2d(c);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    const layer = makeLayer("Background", c);
    startDoc({ width: c.width, height: c.height, layers: [layer], activeId: layer.id });
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>, asLayer: boolean) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (asLayer) addImageLayer(f, f.name);
    else openFile(f, f.name);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
    if (f) addFile(f);
  }

  function exportImage(type: "png" | "jpeg") {
    const d = docRef.current;
    if (!d) return;
    const out = makeCanvas(d.width, d.height);
    const c = ctx2d(out);
    if (type === "jpeg") {
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, d.width, d.height);
    }
    composite(c, d);
    out.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `edited.${type === "png" ? "png" : "jpg"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      `image/${type}`,
      0.92,
    );
  }

  // ---------- layers ----------

  function insertLayer(d: Doc, layer: Layer) {
    const idx = d.layers.findIndex((l) => l.id === d.activeId);
    const layers = [...d.layers];
    layers.splice(idx + 1, 0, layer);
    update({ ...d, layers, activeId: layer.id });
  }

  function patchLayer(id: string, patch: Partial<Layer>, mode: CommitMode = "commit") {
    const d = docRef.current;
    if (!d) return;
    update({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }, mode);
  }

  function selectLayer(id: string) {
    const d = docRef.current;
    if (d) update({ ...d, activeId: id }, "none");
  }

  function addEmptyLayer() {
    const d = docRef.current;
    if (d) insertLayer(d, makeLayer(`Layer ${d.layers.length + 1}`, makeCanvas(d.width, d.height)));
  }

  function duplicateLayer() {
    const d = docRef.current;
    const l = d?.layers.find((x) => x.id === d.activeId);
    // Sharing the canvas is safe: edits are copy-on-write.
    if (d && l) insertLayer(d, { ...l, id: newId(), name: `${l.name} copy`, adjust: { ...l.adjust } });
  }

  function deleteLayer() {
    const d = docRef.current;
    if (!d || d.layers.length < 2) return;
    const idx = d.layers.findIndex((l) => l.id === d.activeId);
    const layers = d.layers.filter((l) => l.id !== d.activeId);
    update({ ...d, layers, activeId: layers[Math.max(0, idx - 1)].id });
  }

  function moveLayer(dir: 1 | -1) {
    const d = docRef.current;
    if (!d) return;
    const idx = d.layers.findIndex((l) => l.id === d.activeId);
    const to = idx + dir;
    if (to < 0 || to >= d.layers.length) return;
    const layers = [...d.layers];
    [layers[idx], layers[to]] = [layers[to], layers[idx]];
    update({ ...d, layers });
  }

  function flatten() {
    const d = docRef.current;
    if (!d || d.layers.length < 2) return;
    const c = makeCanvas(d.width, d.height);
    composite(ctx2d(c), d);
    const layer = makeLayer("Flattened", c);
    update({ ...d, layers: [layer], activeId: layer.id });
  }

  // ---------- image transforms ----------

  function transformDoc(kind: "cw" | "ccw" | "fh" | "fv") {
    const d = docRef.current;
    if (!d) return;
    const { width: W, height: H } = d;
    const rotates = kind === "cw" || kind === "ccw";
    const nw = rotates ? H : W;
    const nh = rotates ? W : H;
    const layers = d.layers.map((l) => {
      const full = makeCanvas(W, H);
      ctx2d(full).drawImage(l.canvas, l.x, l.y);
      const out = makeCanvas(nw, nh);
      const c = ctx2d(out);
      if (kind === "cw") {
        c.translate(H, 0);
        c.rotate(Math.PI / 2);
      } else if (kind === "ccw") {
        c.translate(0, W);
        c.rotate(-Math.PI / 2);
      } else if (kind === "fh") {
        c.translate(W, 0);
        c.scale(-1, 1);
      } else {
        c.translate(0, H);
        c.scale(1, -1);
      }
      c.drawImage(full, 0, 0);
      return { ...l, canvas: out, x: 0, y: 0 };
    });
    cancelCrop();
    update({ ...d, width: nw, height: nh, layers });
    if (rotates) fitZoom({ ...d, width: nw, height: nh });
  }

  function cancelCrop() {
    cropRef.current = null;
    setCropRect(null);
  }

  function applyCrop() {
    const d = docRef.current;
    const r = cropRef.current;
    if (!d || !r) return;
    const n = normalizeRect(r, d);
    if (n.w < 2 || n.h < 2) return cancelCrop();
    const layers = d.layers.map((l) => {
      const out = makeCanvas(n.w, n.h);
      ctx2d(out).drawImage(l.canvas, l.x - n.x, l.y - n.y);
      return { ...l, canvas: out, x: 0, y: 0 };
    });
    const next = { ...d, width: n.w, height: n.h, layers };
    cancelCrop();
    update(next);
    fitZoom(next);
  }

  // ---------- adjustments ----------

  function setAdjust(patch: Partial<Adjust>, mode: CommitMode) {
    if (!active) return;
    patchLayer(active.id, { adjust: { ...active.adjust, ...patch } }, mode);
  }

  // ---------- pointer input ----------

  function toDoc(e: ReactPointerEvent<HTMLCanvasElement>) {
    const cv = e.currentTarget;
    const rect = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * cv.width) / rect.width,
      y: ((e.clientY - rect.top) * cv.height) / rect.height,
    };
  }

  function strokeTo(s: Stroke, x: number, y: number) {
    const c = ctx2d(s.buffer);
    c.strokeStyle = brushColor;
    c.fillStyle = brushColor;
    c.lineWidth = brushSize;
    c.lineCap = "round";
    c.lineJoin = "round";
    if (x === s.last.x && y === s.last.y) {
      c.beginPath();
      c.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      c.fill();
    } else {
      c.beginPath();
      c.moveTo(s.last.x, s.last.y);
      c.lineTo(x, y);
      c.stroke();
    }
    s.last = { x, y };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = docRef.current;
    if (!d || e.button > 0) return;
    const layer = d.layers.find((l) => l.id === d.activeId);
    const p = toDoc(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "brush" || tool === "eraser") {
      if (!layer) return;
      const lx = p.x - layer.x;
      const ly = p.y - layer.y;
      const s: Stroke = {
        layerId: layer.id,
        base: layer.canvas,
        buffer: makeCanvas(layer.canvas.width, layer.canvas.height),
        live: makeCanvas(layer.canvas.width, layer.canvas.height),
        erase: tool === "eraser",
        last: { x: lx, y: ly },
      };
      strokeRef.current = s;
      strokeTo(s, lx, ly);
      schedulePaint();
    } else if (tool === "move") {
      if (layer) dragRef.current = { sx: p.x, sy: p.y, ox: layer.x, oy: layer.y, moved: false };
    } else if (tool === "crop") {
      cropRef.current = { x: p.x, y: p.y, w: 0, h: 0 };
      setCropRect(cropRef.current);
    } else if (tool === "picker") {
      const [r, g, b] = ctx2d(e.currentTarget).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
      setBrushColor(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
      setTool("brush");
    } else if (tool === "text") {
      if (!text.trim()) return;
      const c = makeTextCanvas(text, fontSize, brushColor, FONTS[fontIdx].css, bold);
      insertLayer(d, makeLayer(`Text: ${text.split("\n")[0].slice(0, 20)}`, c, Math.round(p.x), Math.round(p.y)));
      setTool("move");
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = docRef.current;
    if (!d) return;
    const p = toDoc(e);
    const s = strokeRef.current;
    if (s) {
      const layer = d.layers.find((l) => l.id === s.layerId);
      if (!layer) return;
      strokeTo(s, p.x - layer.x, p.y - layer.y);
      schedulePaint();
    } else if (dragRef.current) {
      const g = dragRef.current;
      g.moved = true;
      patchLayer(d.activeId, { x: Math.round(g.ox + p.x - g.sx), y: Math.round(g.oy + p.y - g.sy) }, "none");
    } else if (cropRef.current && e.buttons === 1) {
      const r = cropRef.current;
      cropRef.current = { ...r, w: p.x - r.x, h: p.y - r.y };
      setCropRect(cropRef.current);
    }
  }

  function onPointerUp() {
    const d = docRef.current;
    const s = strokeRef.current;
    if (d && s) {
      const merged = makeCanvas(s.base.width, s.base.height);
      mergeStrokeInto(merged, s.base, s.buffer, brushOpacity, s.erase);
      strokeRef.current = null;
      patchLayer(s.layerId, { canvas: merged });
    }
    if (d && dragRef.current) {
      if (dragRef.current.moved) pushHistory(d);
      dragRef.current = null;
    }
    if (d && cropRef.current) {
      const n = normalizeRect(cropRef.current, d);
      if (n.w < 2 || n.h < 2) cancelCrop();
    }
  }

  // ---------- keyboard + paste ----------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) shortcutsRef.current?.redo();
        else shortcutsRef.current?.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        shortcutsRef.current?.redo();
        return;
      }
      if (mod || e.altKey) return;
      const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (t) setTool(t.id);
      if (e.key === "[") setBrushSize((s) => Math.max(1, Math.round(s / 1.25)));
      if (e.key === "]") setBrushSize((s) => Math.min(400, Math.round(s * 1.25)));
    }
    function onPaste(e: ClipboardEvent) {
      if (isTypingTarget(e.target)) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (f) {
        e.preventDefault();
        shortcutsRef.current?.addFile(f);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  // ---------- UI ----------

  const cursor = tool === "move" ? "move" : tool === "text" ? "text" : "crosshair";

  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40";
  const label = "flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500";

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={openInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileInput(e, false)} />
      <input ref={layerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileInput(e, true)} />

      <div className="mx-auto max-w-[1500px]">
        <AppHeader
          name="Photo"
          replaces="Photoshop"
          blurb="Layers, brushes, text, crop and non-destructive adjustments. Your images never leave this tab."
        >
            <button className={btn} onClick={() => openInputRef.current?.click()}>
              <FolderOpen size={14} /> Open
            </button>
            <button className={btn} onClick={newBlank}>
              <FilePlus size={14} /> Blank
            </button>
            <button className={btn} disabled={!doc} onClick={() => layerInputRef.current?.click()}>
              <ImagePlus size={14} /> Add image
            </button>
            <button className={btn} disabled={!histInfo.undo} onClick={undo} title="Undo (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button className={btn} disabled={!histInfo.redo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={14} />
            </button>
            <button className={btn} disabled={!doc} onClick={() => exportImage("png")}>
              <Download size={14} /> PNG
            </button>
            <button className={btn} disabled={!doc} onClick={() => exportImage("jpeg")}>
              <Download size={14} /> JPG
            </button>
        </AppHeader>

        {error && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[52px_minmax(0,1fr)_300px]">
          {/* Toolbar */}
          <nav className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1.5 lg:flex-col">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={`${t.label} (${t.key})`}
                aria-label={t.label}
                aria-pressed={tool === t.id}
                onClick={() => setTool(t.id)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  tool === t.id ? "bg-accent text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </nav>

          {/* Workspace */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1.5">
              <button className={btn} disabled={!doc} onClick={() => transformDoc("ccw")} title="Rotate left">
                <RotateCcw size={14} />
              </button>
              <button className={btn} disabled={!doc} onClick={() => transformDoc("cw")} title="Rotate right">
                <RotateCw size={14} />
              </button>
              <button className={btn} disabled={!doc} onClick={() => transformDoc("fh")} title="Flip horizontal">
                <FlipHorizontal2 size={14} />
              </button>
              <button className={btn} disabled={!doc} onClick={() => transformDoc("fv")} title="Flip vertical">
                <FlipVertical2 size={14} />
              </button>
              <span className="mx-1 h-5 w-px bg-slate-700" />
              <button className={btn} disabled={!doc} onClick={() => zoomBy(1 / 1.25)} title="Zoom out">
                <ZoomOut size={14} />
              </button>
              <span className="w-12 text-center font-mono text-xs tabular-nums text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button className={btn} disabled={!doc} onClick={() => zoomBy(1.25)} title="Zoom in">
                <ZoomIn size={14} />
              </button>
              <button className={btn} disabled={!doc} onClick={() => fitZoom()} title="Fit to screen">
                <Maximize size={14} />
              </button>
              {doc && (
                <span className="ml-auto font-mono text-[11px] text-slate-500">
                  {doc.width} × {doc.height}
                </span>
              )}
            </div>

            <div
              ref={workspaceRef}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`relative flex h-[60vh] overflow-auto bg-[#0A0D12] lg:h-[calc(100vh-260px)] ${
                dragOver ? "outline outline-2 -outline-offset-4 outline-accent" : ""
              }`}
            >
              {doc ? (
                <div className="m-auto p-4">
                  <canvas
                    ref={canvasRef}
                    width={doc.width}
                    height={doc.height}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="block touch-none shadow-2xl shadow-black/50"
                    style={{
                      width: doc.width * zoom,
                      height: doc.height * zoom,
                      background: CHECKERBOARD,
                      cursor,
                      imageRendering: zoom > 2 ? "pixelated" : "auto",
                    }}
                  />
                </div>
              ) : (
                <div className="m-auto flex max-w-sm flex-col items-center gap-4 p-6 text-center">
                  <div className="rounded-full bg-slate-800 p-4 text-accent">
                    <ImagePlus size={28} />
                  </div>
                  <p className="text-sm text-slate-400">
                    Drop an image here, paste one with <kbd className="font-mono text-slate-300">Ctrl+V</kbd>, or
                    start from scratch.
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                      onClick={() => openInputRef.current?.click()}
                    >
                      Open image
                    </button>
                    <button className={btn} onClick={newBlank}>
                      Blank canvas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <aside className="flex flex-col gap-3">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">{TOOLS.find((t) => t.id === tool)?.label}</h2>

              {(tool === "brush" || tool === "eraser" || tool === "text" || tool === "picker") && (
                <div className="mb-3 flex items-center gap-3">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-slate-700 bg-transparent"
                    aria-label="Color"
                  />
                  <span className="font-mono text-xs uppercase text-slate-400">{brushColor}</span>
                </div>
              )}

              {(tool === "brush" || tool === "eraser") && (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>
                      Size <span className="text-slate-300">{brushSize}px</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={400}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="accent-teal-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>
                      Opacity <span className="text-slate-300">{Math.round(brushOpacity * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={Math.round(brushOpacity * 100)}
                      onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                      className="accent-teal-500"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Paints on the selected layer. <kbd className="font-mono">[</kbd> / <kbd className="font-mono">]</kbd>{" "}
                    resize.
                  </p>
                </div>
              )}

              {tool === "text" && (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
                  />
                  <div className="flex gap-2">
                    <select
                      value={fontIdx}
                      onChange={(e) => setFontIdx(Number(e.target.value))}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                    >
                      {FONTS.map((f, i) => (
                        <option key={f.label} value={i}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setBold((b) => !b)}
                      aria-pressed={bold}
                      className={`rounded-md border px-3 text-sm font-bold ${
                        bold ? "border-accent bg-accent/20 text-white" : "border-slate-700 text-slate-400"
                      }`}
                    >
                      B
                    </button>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>
                      Size <span className="text-slate-300">{fontSize}px</span>
                    </span>
                    <input
                      type="range"
                      min={8}
                      max={400}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="accent-teal-500"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Click the image to place text as a new layer.</p>
                </div>
              )}

              {tool === "move" && <p className="text-xs text-slate-500">Drag to reposition the selected layer.</p>}
              {tool === "picker" && <p className="text-xs text-slate-500">Click the image to sample a color.</p>}

              {tool === "crop" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">Drag a box over the image, then apply.</p>
                  {cropRect && doc && (
                    <>
                      <p className="font-mono text-xs text-slate-400">
                        {normalizeRect(cropRect, doc).w} × {normalizeRect(cropRect, doc).h}
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                          onClick={applyCrop}
                        >
                          <Check size={14} /> Apply crop
                        </button>
                        <button className={btn} onClick={cancelCrop}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Adjust</h2>
                <button
                  className="text-xs text-slate-400 hover:text-white disabled:opacity-40"
                  disabled={!active}
                  onClick={() => setAdjust({ ...NEUTRAL }, "commit")}
                >
                  Reset
                </button>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    disabled={!active}
                    onClick={() => setAdjust({ ...NEUTRAL, ...p.adjust }, "commit")}
                    className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent hover:text-white disabled:opacity-40"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                {ADJUST_SLIDERS.map((s) => (
                  <label key={s.key} className="flex flex-col gap-1">
                    <span className={label}>
                      {s.label}
                      <span className="text-slate-300">
                        {active ? active.adjust[s.key] : NEUTRAL[s.key]}
                        {s.unit}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      disabled={!active}
                      value={active ? active.adjust[s.key] : NEUTRAL[s.key]}
                      onChange={(e) => setAdjust({ [s.key]: Number(e.target.value) }, "soon")}
                      onDoubleClick={() => setAdjust({ [s.key]: NEUTRAL[s.key] }, "commit")}
                      className="accent-teal-500"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Applies to the selected layer and stays editable.</p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers size={14} /> Layers
                </h2>
                <div className="flex gap-1">
                  <button className={btn} disabled={!doc} onClick={addEmptyLayer} title="New layer">
                    <Plus size={14} />
                  </button>
                  <button className={btn} disabled={!active} onClick={duplicateLayer} title="Duplicate layer">
                    <Copy size={14} />
                  </button>
                  <button
                    className={btn}
                    disabled={!doc || doc.layers.length < 2}
                    onClick={deleteLayer}
                    title="Delete layer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {doc ? (
                <>
                  <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                    {[...doc.layers].reverse().map((l) => (
                      <li
                        key={l.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                          l.id === doc.activeId ? "bg-accent/20 text-white" : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <button
                          onClick={() => patchLayer(l.id, { visible: !l.visible })}
                          aria-label={l.visible ? "Hide layer" : "Show layer"}
                          className="text-slate-400 hover:text-white"
                        >
                          {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => selectLayer(l.id)} className="min-w-0 flex-1 truncate text-left">
                          {l.name}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {active && (
                    <div className="mt-3 flex flex-col gap-2.5 border-t border-slate-800 pt-3">
                      <input
                        value={active.name}
                        onChange={(e) => patchLayer(active.id, { name: e.target.value }, "soon")}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                        aria-label="Layer name"
                      />
                      <label className="flex flex-col gap-1">
                        <span className={label}>
                          Opacity <span className="text-slate-300">{Math.round(active.opacity * 100)}%</span>
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(active.opacity * 100)}
                          onChange={(e) => patchLayer(active.id, { opacity: Number(e.target.value) / 100 }, "soon")}
                          className="accent-teal-500"
                        />
                      </label>
                      <select
                        value={active.blend}
                        onChange={(e) =>
                          patchLayer(active.id, { blend: e.target.value as GlobalCompositeOperation })
                        }
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                        aria-label="Blend mode"
                      >
                        {BLEND_MODES.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button className={btn} onClick={() => moveLayer(1)} title="Move up">
                          <ArrowUp size={14} />
                        </button>
                        <button className={btn} onClick={() => moveLayer(-1)} title="Move down">
                          <ArrowDown size={14} />
                        </button>
                        <button className={`${btn} ml-auto`} disabled={doc.layers.length < 2} onClick={flatten}>
                          Flatten
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Open an image to start.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
