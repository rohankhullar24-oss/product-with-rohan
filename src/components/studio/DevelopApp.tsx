"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  Clipboard,
  ClipboardPaste,
  Download,
  Flag,
  FlagOff,
  FlipHorizontal2,
  FolderOpen,
  Grid3x3,
  Redo2,
  RotateCw,
  SlidersHorizontal,
  Star,
  Undo2,
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
  labelCls,
  useHistory,
  useKeys,
} from "./shared";

// A non-destructive photo developer. Edits are a settings object per photo;
// the pixels are re-rendered from the original on every change: a downscaled
// copy for the screen, the full-resolution file on export.

const BANDS = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"] as const;
type Band = (typeof BANDS)[number];
const BAND_HUE: Record<Band, number> = { red: 0, orange: 30, yellow: 60, green: 120, aqua: 180, blue: 240, purple: 280, magenta: 320 };
const BAND_SWATCH: Record<Band, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  aqua: "#06b6d4",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  magenta: "#d946ef",
};

type Settings = {
  temp: number;
  tint: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  vibrance: number;
  saturation: number;
  vignette: number;
  curve: [number, number][];
  hsl: Record<Band, { h: number; s: number; l: number }>;
  rotate: number;
  flipH: boolean;
};

type Photo = {
  id: string;
  name: string;
  file: File;
  preview: ImageData;
  thumbSrc: ImageData;
  thumb: string;
  rating: number;
  flag: "none" | "pick" | "reject";
};

const neutralHsl = () => Object.fromEntries(BANDS.map((b) => [b, { h: 0, s: 0, l: 0 }])) as Settings["hsl"];

const DEFAULTS: Settings = {
  temp: 0,
  tint: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  vignette: 0,
  curve: [
    [0, 0],
    [1, 1],
  ],
  hsl: neutralHsl(),
  rotate: 0,
  flipH: false,
};

const PRESETS: { name: string; s: Partial<Settings> }[] = [
  { name: "Auto pop", s: { exposure: 0.15, contrast: 18, highlights: -30, shadows: 30, whites: 10, blacks: -8, vibrance: 25 } },
  { name: "B&W punch", s: { saturation: -100, contrast: 35, highlights: -20, shadows: 15, blacks: -15 } },
  { name: "Golden hour", s: { temp: 35, tint: 8, vibrance: 20, highlights: -25, vignette: -25 } },
  { name: "Cool film", s: { temp: -20, contrast: -10, blacks: 25, saturation: -15, curve: [[0, 0.08], [0.5, 0.5], [1, 0.95]] } },
  { name: "Moody", s: { exposure: -0.3, contrast: 25, highlights: -40, saturation: -20, vignette: -40 } },
  { name: "Bright & airy", s: { exposure: 0.45, contrast: -15, highlights: -35, shadows: 40, vibrance: 15, temp: -5 } },
];

const PREVIEW_MAX = 1400;
const THUMB_MAX = 200;

// ---------- pixel pipeline ----------

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/** Monotone cubic interpolation through sorted control points. */
function curveFn(pts: [number, number][]) {
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

function buildLuts(s: Settings) {
  const ev = 2 ** s.exposure;
  const rMul = 1 + s.temp * 0.004;
  const bMul = 1 - s.temp * 0.004;
  const gMul = 1 - s.tint * 0.003;
  const chan = [rMul, gMul, bMul].map((mul) => {
    const lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) lut[i] = clamp(toSrgb(clamp(toLinear(i / 255) * ev * mul, 0, 1)), 0, 1);
    return lut;
  });
  const curve = curveFn(s.curve);
  const lo = -s.blacks * 0.0015;
  const hi = 1 - s.whites * 0.0015;
  const k = 1 + s.contrast / 100;
  const tone = new Uint8ClampedArray(1024);
  for (let i = 0; i < 1024; i++) {
    let v = i / 1023;
    v = (v - lo) / (hi - lo);
    v = clamp(v, 0, 1);
    v += (s.shadows / 100) * 0.25 * 6.75 * v * (1 - v) * (1 - v);
    v += (s.highlights / 100) * 0.25 * 6.75 * v * v * (1 - v);
    v = (v - 0.5) * k + 0.5;
    v = curve(clamp(v, 0, 1));
    tone[i] = Math.round(clamp(v, 0, 1) * 255);
  }
  return { chan, tone };
}

function isNeutral(s: Settings) {
  return JSON.stringify(s) === JSON.stringify(DEFAULTS);
}

function processImage(src: ImageData, s: Settings): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  if (isNeutral(s)) return out;
  const { chan, tone } = buildLuts(s);
  const [lr, lg, lb] = chan;
  const d = out.data;
  const bands = BANDS.map((b) => ({ hue: BAND_HUE[b], ...s.hsl[b] })).filter((b) => b.h || b.s || b.l);
  const color = bands.length > 0 || s.saturation !== 0 || s.vibrance !== 0;
  const sat = 1 + s.saturation / 100;
  const vib = s.vibrance / 100;
  const vig = s.vignette / 100;
  const { width: w, height: h } = src;
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    const dy = (y - cy) / cy;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = tone[(lr[d[i]] * 1023) | 0] / 255;
      let g = tone[(lg[d[i + 1]] * 1023) | 0] / 255;
      let b = tone[(lb[d[i + 2]] * 1023) | 0] / 255;
      if (color) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let l = (max + min) / 2;
        let sv = 0;
        let hue = 0;
        const delta = max - min;
        if (delta > 1e-5) {
          sv = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
          if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
          else if (max === g) hue = ((b - r) / delta + 2) * 60;
          else hue = ((r - g) / delta + 4) * 60;
        }
        if (bands.length && sv > 0) {
          let dh = 0;
          let ds = 0;
          let dl = 0;
          for (const band of bands) {
            let dist = Math.abs(hue - band.hue);
            if (dist > 180) dist = 360 - dist;
            const wgt = Math.max(0, 1 - dist / 45);
            if (!wgt) continue;
            dh += wgt * band.h * 0.3;
            ds += (wgt * band.s) / 100;
            dl += (wgt * band.l) / 100;
          }
          hue = (hue + dh + 360) % 360;
          sv = clamp(sv * (1 + ds), 0, 1);
          l = clamp(l + dl * 0.3 * sv, 0, 1);
        }
        sv = clamp(sv * sat * (1 + vib * (1 - sv)), 0, 1);
        if (sv <= 1e-5) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + sv) : l + sv - l * sv;
          const p = 2 * l - q;
          const hk = hue / 360;
          const conv = (t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };
          r = conv(hk + 1 / 3);
          g = conv(hk);
          b = conv(hk - 1 / 3);
        }
      }
      if (vig) {
        const dx = (x - cx) / cx;
        const dist = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
        const t = clamp((dist - 0.35) / 0.65, 0, 1);
        const f = 1 + vig * t * t * (3 - 2 * t);
        r *= f;
        g *= f;
        b *= f;
      }
      d[i] = r * 255;
      d[i + 1] = g * 255;
      d[i + 2] = b * 255;
    }
  }
  return out;
}

async function decode(file: File, max: number): Promise<ImageData> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return ctx.getImageData(0, 0, c.width, c.height);
}

/** Draws image data with rotation/flip applied into a canvas. */
function renderTo(canvas: HTMLCanvasElement, img: ImageData, s: Settings) {
  const tmp = document.createElement("canvas");
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext("2d")!.putImageData(img, 0, 0);
  const quarter = ((s.rotate % 360) + 360) % 360;
  const swap = quarter === 90 || quarter === 270;
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((quarter * Math.PI) / 180);
  if (s.flipH) ctx.scale(-1, 1);
  ctx.drawImage(tmp, -img.width / 2, -img.height / 2);
  ctx.restore();
}

function toDataUrl(img: ImageData, s: Settings) {
  const c = document.createElement("canvas");
  renderTo(c, img, s);
  return c.toDataURL("image/jpeg", 0.8);
}

function drawHistogram(c: HTMLCanvasElement | null, img: ImageData) {
  if (!c) return;
  const bins = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  const d = img.data;
  const step = Math.max(1, Math.floor(d.length / 4 / 200000)) * 4;
  for (let i = 0; i < d.length; i += step) {
    bins[0][d[i]]++;
    bins[1][d[i + 1]]++;
    bins[2][d[i + 2]]++;
  }
  let peak = 1;
  for (const b of bins) for (let i = 2; i < 254; i++) peak = Math.max(peak, b[i]);
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "lighter";
  ["rgba(239,68,68,0.7)", "rgba(34,197,94,0.7)", "rgba(59,130,246,0.7)"].forEach((col, ch) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, c.height);
    for (let i = 0; i < 256; i++) ctx.lineTo((i / 255) * c.width, c.height - Math.min(1, bins[ch][i] / peak) * c.height);
    ctx.lineTo(c.width, c.height);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
}

function CurveEditor({ points, onChange, onCommit }: {
  points: [number, number][];
  onChange: (p: [number, number][]) => void;
  onCommit: () => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const dragIdx = useRef<number | null>(null);
  const fn = curveFn(points);
  const path = Array.from({ length: 65 }, (_, i) => {
    const x = i / 64;
    return `${i ? "L" : "M"}${x * 200} ${200 - clamp(fn(x), 0, 1) * 200}`;
  }).join("");

  function toPt(e: { clientX: number; clientY: number }): [number, number] {
    const r = ref.current!.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp(1 - (e.clientY - r.top) / r.height, 0, 1)];
  }

  function down(e: ReactPointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toPt(e);
    let idx = points.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 0.05);
    if (idx < 0) {
      const next = [...points, [x, y] as [number, number]].sort((a, b) => a[0] - b[0]);
      idx = next.findIndex((p) => p[0] === x && p[1] === y);
      onChange(next);
    }
    dragIdx.current = idx;
  }

  function move(e: ReactPointerEvent<SVGSVGElement>) {
    const idx = dragIdx.current;
    if (idx === null) return;
    const [x, y] = toPt(e);
    const next = points.map((p) => [...p] as [number, number]);
    const isEnd = idx === 0 || idx === points.length - 1;
    const lo = idx > 0 ? points[idx - 1][0] + 0.01 : 0;
    const hi = idx < points.length - 1 ? points[idx + 1][0] - 0.01 : 1;
    next[idx] = [isEnd ? points[idx][0] : clamp(x, lo, hi), y];
    onChange(next);
  }

  function up() {
    if (dragIdx.current !== null) onCommit();
    dragIdx.current = null;
  }

  return (
    <svg
      ref={ref}
      viewBox="0 0 200 200"
      className="aspect-square w-full touch-none rounded-md bg-slate-950"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onDoubleClick={(e) => {
        const [x, y] = toPt(e);
        const idx = points.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 0.05);
        if (idx > 0 && idx < points.length - 1) {
          onChange(points.filter((_, i) => i !== idx));
          onCommit();
        }
      }}
    >
      {[50, 100, 150].map((v) => (
        <g key={v} stroke="#1e293b">
          <line x1={v} y1={0} x2={v} y2={200} />
          <line x1={0} y1={v} x2={200} y2={v} />
        </g>
      ))}
      <line x1={0} y1={200} x2={200} y2={0} stroke="#334155" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="#e2e8f0" strokeWidth={1.5} />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x * 200} cy={200 - y * 200} r={4} fill="#14b8a6" stroke="#fff" strokeWidth={1} />
      ))}
    </svg>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={(e) => {
            e.stopPropagation();
            onChange(value === n ? 0 : n);
          }}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={n <= value ? "text-amber-400" : "text-slate-600 hover:text-slate-400"}
        >
          <Star size={12} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </span>
  );
}

export default function DevelopApp() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const hist = useHistory<Record<string, Settings>>(() => ({}));
  const all = hist.state;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"library" | "develop">("library");
  const [minRating, setMinRating] = useState(0);
  const [showBefore, setShowBefore] = useState(false);
  const [hslTab, setHslTab] = useState<"h" | "s" | "l">("h");
  const [clipboard, setClipboard] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histoRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = photos.find((p) => p.id === activeId) ?? null;
  const settings = (activeId && all[activeId]) || DEFAULTS;
  const visible = photos.filter((p) => p.rating >= minRating);

  // Re-render the preview and histogram whenever the edit changes.
  useEffect(() => {
    if (mode !== "develop" || !active || !canvasRef.current) return;
    const id = requestAnimationFrame(() => {
      const out = showBefore ? active.preview : processImage(active.preview, settings);
      renderTo(canvasRef.current!, out, settings);
      drawHistogram(histoRef.current, out);
    });
    return () => cancelAnimationFrame(id);
  }, [active, settings, showBefore, mode]);

  // Keep the active photo's thumbnail in step with its edits.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const thumb = toDataUrl(processImage(active.thumbSrc, settings), settings);
      setPhotos((ps) => ps.map((p) => (p.id === active.id ? { ...p, thumb } : p)));
    }, 300);
    return () => clearTimeout(t);
    // Only re-run when the edit changes, not when the thumbnail it sets does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, settings]);

  async function importFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setBusy(`Importing ${files.length} photo${files.length > 1 ? "s" : ""}…`);
    const added: Photo[] = [];
    for (const file of files) {
      try {
        const preview = await decode(file, PREVIEW_MAX);
        const thumbSrc = await decode(file, THUMB_MAX);
        added.push({
          id: `p-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          file,
          preview,
          thumbSrc,
          thumb: toDataUrl(thumbSrc, DEFAULTS),
          rating: 0,
          flag: "none",
        });
      } catch {
        setError(`Couldn't read ${file.name}. RAW files aren't supported in the browser; export a JPEG or PNG first.`);
      }
    }
    setBusy(null);
    if (!added.length) return;
    setPhotos((ps) => [...ps, ...added]);
    if (!activeId) setActiveId(added[0].id);
    if (added.length === 1 && !photos.length) setMode("develop");
  }

  function setSettings(patch: Partial<Settings>, commit = true) {
    if (!activeId) return;
    hist.set((s) => ({ ...s, [activeId]: { ...(s[activeId] ?? DEFAULTS), ...patch } }), commit);
  }

  function patchPhoto(id: string, patch: Partial<Photo>) {
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function syncToAll() {
    const s = settings;
    hist.set((cur) => Object.fromEntries(photos.map((p) => [p.id, { ...s, rotate: cur[p.id]?.rotate ?? 0, flipH: cur[p.id]?.flipH ?? false }])));
  }

  async function exportPhoto(p: Photo) {
    const s = all[p.id] ?? DEFAULTS;
    const full = await decode(p.file, 8192);
    const c = document.createElement("canvas");
    renderTo(c, processImage(full, s), s);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
    if (blob) downloadBlob(blob, p.name.replace(/\.[^.]+$/, "") + "-edit.jpg");
  }

  async function exportMany(list: Photo[]) {
    try {
      for (let i = 0; i < list.length; i++) {
        setBusy(`Exporting ${i + 1} of ${list.length}…`);
        await exportPhoto(list[i]);
      }
    } catch {
      setError("Export failed. The image may be too large for this browser.");
    } finally {
      setBusy(null);
    }
  }

  function step(dir: 1 | -1) {
    if (!visible.length) return;
    const idx = visible.findIndex((p) => p.id === activeId);
    const next = visible[clamp(idx + dir, 0, visible.length - 1)];
    setActiveId(next.id);
  }

  useKeys((e) => {
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    if (e.metaKey || e.ctrlKey || !active) return;
    if (e.key >= "0" && e.key <= "5") patchPhoto(active.id, { rating: Number(e.key) });
    else if (e.key.toLowerCase() === "p") patchPhoto(active.id, { flag: "pick" });
    else if (e.key.toLowerCase() === "x") patchPhoto(active.id, { flag: "reject" });
    else if (e.key.toLowerCase() === "u") patchPhoto(active.id, { flag: "none" });
    else if (e.key.toLowerCase() === "g") setMode("library");
    else if (e.key.toLowerCase() === "d") setMode("develop");
    else if (e.key === "\\") setShowBefore((b) => !b);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  });

  const basic: { key: keyof Settings; label: string; min: number; max: number; step?: number; unit?: string }[] = [
    { key: "temp", label: "Temperature", min: -100, max: 100 },
    { key: "tint", label: "Tint", min: -100, max: 100 },
    { key: "exposure", label: "Exposure", min: -3, max: 3, step: 0.05, unit: " EV" },
    { key: "contrast", label: "Contrast", min: -100, max: 100 },
    { key: "highlights", label: "Highlights", min: -100, max: 100 },
    { key: "shadows", label: "Shadows", min: -100, max: 100 },
    { key: "whites", label: "Whites", min: -100, max: 100 },
    { key: "blacks", label: "Blacks", min: -100, max: 100 },
    { key: "vibrance", label: "Vibrance", min: -100, max: 100 },
    { key: "saturation", label: "Saturation", min: -100, max: 100 },
  ];

  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={importFiles} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Develop" replaces="Lightroom" blurb="Import a shoot, rate and flag it, then grade each photo. Edits never touch your originals.">
          <div className="flex rounded-md border border-slate-700 p-0.5">
            <button onClick={() => setMode("library")} className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${mode === "library" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
              <Grid3x3 size={14} /> Library
            </button>
            <button onClick={() => setMode("develop")} disabled={!active} className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs disabled:opacity-40 ${mode === "develop" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
              <SlidersHorizontal size={14} /> Develop
            </button>
          </div>
          <button className={btn} onClick={() => fileRef.current?.click()}>
            <FolderOpen size={14} /> Import
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo">
            <Undo2 size={14} />
          </button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo">
            <Redo2 size={14} />
          </button>
          <button className={btnPrimary} disabled={!active || !!busy} onClick={() => active && exportMany([active])}>
            <Download size={14} /> Export
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {busy && <p className="mb-3 text-sm text-accent">{busy}</p>}

        {!photos.length ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 text-slate-400 hover:border-accent hover:text-white"
          >
            <FolderOpen size={28} />
            <span className="text-sm">Import photos (JPEG, PNG, WebP, HEIC where supported)</span>
          </button>
        ) : mode === "library" ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>{visible.length} of {photos.length} photos</span>
              <label className="flex items-center gap-2">
                Show
                <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                  <option value={0}>All</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}★ and up
                    </option>
                  ))}
                </select>
              </label>
              <button className={btn} onClick={() => exportMany(visible.filter((p) => p.flag === "pick"))} disabled={!visible.some((p) => p.flag === "pick") || !!busy}>
                Export picks
              </button>
              <span className="ml-auto">1–5 rate · P pick · X reject · ←/→ browse · D develop</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visible.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  onDoubleClick={() => {
                    setActiveId(p.id);
                    setMode("develop");
                  }}
                  className={`cursor-pointer rounded-lg border p-2 transition-colors ${p.id === activeId ? "border-accent bg-accent/10" : "border-slate-800 hover:border-slate-600"} ${p.flag === "reject" ? "opacity-40" : ""}`}
                >
                  <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb} alt={p.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <Stars value={p.rating} onChange={(v) => patchPhoto(p.id, { rating: v })} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        patchPhoto(p.id, { flag: p.flag === "pick" ? "none" : "pick" });
                      }}
                      className={p.flag === "pick" ? "text-accent" : p.flag === "reject" ? "text-red-400" : "text-slate-600 hover:text-slate-400"}
                      aria-label="Toggle pick"
                    >
                      {p.flag === "reject" ? <FlagOff size={12} /> : <Flag size={12} fill={p.flag === "pick" ? "currentColor" : "none"} />}
                    </button>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="relative flex h-[55vh] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#0A0D12] p-3 lg:h-[calc(100vh-330px)]">
                <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
                <button
                  onPointerDown={() => setShowBefore(true)}
                  onPointerUp={() => setShowBefore(false)}
                  onPointerLeave={() => setShowBefore(false)}
                  className="absolute top-3 right-3 rounded-md bg-black/60 px-2.5 py-1 text-xs text-white"
                >
                  {showBefore ? "Before" : "Hold for before"}
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-2">
                {visible.map((p) => (
                  <button key={p.id} onClick={() => setActiveId(p.id)} className={`h-16 w-20 shrink-0 overflow-hidden rounded border-2 ${p.id === activeId ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb} alt={p.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <canvas ref={histoRef} width={300} height={90} className="h-[90px] w-full rounded bg-slate-950" />
                {active && (
                  <div className="mt-2 flex items-center justify-between">
                    <Stars value={active.rating} onChange={(v) => patchPhoto(active.id, { rating: v })} />
                    <span className="truncate text-[11px] text-slate-500">{active.name}</span>
                  </div>
                )}
              </section>

              <Panel
                title="Basic"
                right={
                  <button className="text-xs text-slate-400 hover:text-white" onClick={() => setSettings({ ...DEFAULTS, rotate: settings.rotate, flipH: settings.flipH })}>
                    Reset
                  </button>
                }
              >
                <div className="flex flex-col gap-2.5">
                  {basic.map((b) => (
                    <Slider
                      key={b.key}
                      label={b.label}
                      value={settings[b.key] as number}
                      min={b.min}
                      max={b.max}
                      step={b.step}
                      unit={b.unit}
                      onChange={(v) => setSettings({ [b.key]: v }, false)}
                      onReset={() => setSettings({ [b.key]: DEFAULTS[b.key] })}
                    />
                  ))}
                </div>
              </Panel>

              <Panel title="Tone curve" right={<button className="text-xs text-slate-400 hover:text-white" onClick={() => setSettings({ curve: DEFAULTS.curve })}>Reset</button>}>
                <CurveEditor points={settings.curve} onChange={(curve) => setSettings({ curve }, false)} onCommit={hist.commit} />
                <p className="mt-2 text-[11px] text-slate-500">Click to add a point, drag to shape, double-click to remove.</p>
              </Panel>

              <Panel
                title="HSL / color"
                right={
                  <div className="flex rounded border border-slate-700 text-[11px]">
                    {(["h", "s", "l"] as const).map((t) => (
                      <button key={t} onClick={() => setHslTab(t)} className={`px-2 py-0.5 ${hslTab === t ? "bg-slate-700 text-white" : "text-slate-400"}`}>
                        {t === "h" ? "Hue" : t === "s" ? "Sat" : "Lum"}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="flex flex-col gap-2">
                  {BANDS.map((b) => (
                    <div key={b} className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: BAND_SWATCH[b] }} />
                      <div className="flex-1">
                        <Slider
                          label={b}
                          value={settings.hsl[b][hslTab]}
                          min={-100}
                          max={100}
                          onChange={(v) => setSettings({ hsl: { ...settings.hsl, [b]: { ...settings.hsl[b], [hslTab]: v } } }, false)}
                          onReset={() => setSettings({ hsl: { ...settings.hsl, [b]: { ...settings.hsl[b], [hslTab]: 0 } } })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Effects & transform">
                <Slider label="Vignette" value={settings.vignette} min={-100} max={100} onChange={(v) => setSettings({ vignette: v }, false)} onReset={() => setSettings({ vignette: 0 })} />
                <div className="mt-3 flex gap-1">
                  <button className={btn} onClick={() => setSettings({ rotate: (settings.rotate + 90) % 360 })}>
                    <RotateCw size={14} /> Rotate
                  </button>
                  <button className={btn} onClick={() => setSettings({ flipH: !settings.flipH })}>
                    <FlipHorizontal2 size={14} /> Flip
                  </button>
                </div>
              </Panel>

              <Panel title="Presets & sync">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button key={p.name} onClick={() => setSettings({ ...DEFAULTS, hsl: neutralHsl(), ...p.s, rotate: settings.rotate, flipH: settings.flipH })} className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent hover:text-white">
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button className={btn} onClick={() => setClipboard(settings)}>
                    <Clipboard size={14} /> Copy
                  </button>
                  <button className={btn} disabled={!clipboard} onClick={() => clipboard && setSettings({ ...clipboard, rotate: settings.rotate, flipH: settings.flipH })}>
                    <ClipboardPaste size={14} /> Paste
                  </button>
                  <button className={btn} disabled={photos.length < 2} onClick={syncToAll}>
                    Sync to all
                  </button>
                </div>
                <p className={`${labelCls} mt-3 normal-case tracking-normal`}>\ before/after · 1–5 rate · ←/→ next photo</p>
              </Panel>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
