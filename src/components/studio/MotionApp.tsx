"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  Circle,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Pause,
  Play,
  Redo2,
  Repeat,
  SkipBack,
  Square,
  Timer,
  Trash2,
  Type,
  Undo2,
  ArrowUp,
  ArrowDown,
  Copy,
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
  formatTime,
  handleUndoKeys,
  inputCls,
  labelCls,
  loadImage,
  readAsDataURL,
  recordCanvas,
  uid,
  useHistory,
  useKeys,
} from "./shared";

// Keyframe animation. Each animatable property is either a static base value
// or a list of keyframes (once its stopwatch is on), interpolated with easing.

type Prop = "x" | "y" | "scale" | "rotation" | "opacity";
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Key = { id: string; t: number; v: number; ease: Ease };

type MLayer = {
  id: string;
  name: string;
  type: "text" | "rect" | "ellipse" | "image";
  inPoint: number;
  outPoint: number;
  base: Record<Prop, number>;
  keys: Partial<Record<Prop, Key[]>>;
  color: string;
  w: number;
  h: number;
  radius: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  src?: string;
  shadow: boolean;
  blur: number;
  hidden?: boolean;
};

type Comp = { width: number; height: number; duration: number; background: string; layers: MLayer[] };

type Drag =
  | { kind: "canvas"; id: string; dx: number; dy: number }
  | { kind: "bar" | "barL" | "barR"; id: string; x0: number; orig: MLayer }
  | { kind: "key"; id: string; prop: Prop; keyId: string; x0: number; t0: number }
  | { kind: "scrub" };

const PROPS: { id: Prop; label: string; min: number; max: number; unit: string }[] = [
  { id: "x", label: "Position X", min: -2000, max: 4000, unit: "px" },
  { id: "y", label: "Position Y", min: -2000, max: 4000, unit: "px" },
  { id: "scale", label: "Scale", min: 0, max: 400, unit: "%" },
  { id: "rotation", label: "Rotation", min: -720, max: 720, unit: "°" },
  { id: "opacity", label: "Opacity", min: 0, max: 100, unit: "%" },
];

const EASES: Ease[] = ["easeInOut", "easeOut", "easeIn", "linear", "hold"];
const COMP_SIZES = [
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1080 × 1080", w: 1080, h: 1080 },
  { label: "1080 × 1920", w: 1080, h: 1920 },
];
const FPS = 30;
const LABEL_W = 180;

// Only ever called from event handlers and animation frames.
const now = () => performance.now();

function ease(u: number, e: Ease) {
  switch (e) {
    case "linear":
      return u;
    case "easeIn":
      return u * u * u;
    case "easeOut":
      return 1 - (1 - u) ** 3;
    case "easeInOut":
      return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    case "hold":
      return 0;
  }
}

function valueAt(l: MLayer, p: Prop, t: number) {
  const keys = l.keys[p];
  if (!keys?.length) return l.base[p];
  if (t <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  let i = 0;
  while (t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  return a.v + (b.v - a.v) * ease(u, a.ease);
}

function setValue(l: MLayer, p: Prop, t: number, v: number): MLayer {
  const keys = l.keys[p];
  if (!keys?.length) return { ...l, base: { ...l.base, [p]: v } };
  const near = keys.find((k) => Math.abs(k.t - t) < 0.5 / FPS);
  const next = near
    ? keys.map((k) => (k === near ? { ...k, v } : k))
    : [...keys, { id: uid("k"), t, v, ease: "easeInOut" as Ease }].sort((a, b) => a.t - b.t);
  return { ...l, keys: { ...l.keys, [p]: next } };
}

function withKeys(l: MLayer, p: Prop, pairs: [number, number, Ease?][]): MLayer {
  return {
    ...l,
    keys: { ...l.keys, [p]: pairs.map(([t, v, e]) => ({ id: uid("k"), t, v, ease: e ?? "easeOut" })).sort((a, b) => a.t - b.t) },
  };
}

function newLayer(type: MLayer["type"], comp: Comp, extra: Partial<MLayer> = {}): MLayer {
  return {
    id: uid("l"),
    name: type === "text" ? "Text" : type === "rect" ? "Rectangle" : type === "ellipse" ? "Ellipse" : "Image",
    type,
    inPoint: 0,
    outPoint: comp.duration,
    base: { x: comp.width / 2, y: comp.height / 2, scale: 100, rotation: 0, opacity: 100 },
    keys: {},
    color: type === "text" ? "#ffffff" : "#14b8a6",
    w: 400,
    h: 400,
    radius: 32,
    text: "Hello",
    fontSize: 160,
    fontWeight: 800,
    shadow: false,
    blur: 0,
    ...extra,
  };
}

function starterComp(): Comp {
  const comp: Comp = { width: 1920, height: 1080, duration: 5, background: "#0f172a", layers: [] };
  let circle = newLayer("ellipse", comp, { name: "Circle", w: 520, h: 520, color: "#0d9488" });
  circle = withKeys(circle, "scale", [[0, 0], [0.6, 112, "easeOut"], [0.9, 100]]);
  circle = withKeys(circle, "rotation", [[0, 0, "linear"], [5, 90]]);
  let title = newLayer("text", comp, { name: "Title", text: "Open Studio", fontSize: 150 });
  title = withKeys(title, "opacity", [[0.5, 0], [1.2, 100]]);
  title = withKeys(title, "y", [[0.5, comp.height / 2 + 120], [1.4, comp.height / 2]]);
  let sub = newLayer("text", comp, { name: "Subtitle", text: "made in the browser", fontSize: 60, fontWeight: 500, color: "#99f6e4" });
  sub = { ...sub, base: { ...sub.base, y: comp.height / 2 + 130 } };
  sub = withKeys(sub, "opacity", [[1.3, 0], [2, 100]]);
  return { ...comp, layers: [circle, title, sub] };
}

function layerSize(l: MLayer, ctx: CanvasRenderingContext2D): [number, number] {
  if (l.type !== "text") return [l.w, l.h];
  ctx.font = `${l.fontWeight} ${l.fontSize}px system-ui, Arial, sans-serif`;
  const lines = l.text.split("\n");
  return [Math.max(...lines.map((t) => ctx.measureText(t).width)), l.fontSize * 1.2 * lines.length];
}

export default function MotionApp() {
  const hist = useHistory<Comp>(starterComp);
  const comp = hist.state;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [selKey, setSelKey] = useState<{ prop: Prop; id: string } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgs = useRef(new Map<string, HTMLImageElement>());
  const clock = useRef<{ wall: number; t: number; once?: () => void } | null>(null);
  const live = useRef({ comp, loop });

  const sel = comp.layers.find((l) => l.id === selected) ?? null;
  const pps = 900 / comp.duration;

  // ---------- render ----------

  function draw(time: number, c: Comp = live.current.comp) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (const l of c.layers) {
      if (l.hidden || time < l.inPoint || time >= l.outPoint) continue;
      ctx.save();
      ctx.translate(valueAt(l, "x", time), valueAt(l, "y", time));
      ctx.rotate((valueAt(l, "rotation", time) * Math.PI) / 180);
      const s = valueAt(l, "scale", time) / 100;
      ctx.scale(s, s);
      ctx.globalAlpha = clamp(valueAt(l, "opacity", time) / 100, 0, 1);
      if (l.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 16;
      }
      if (l.blur) ctx.filter = `blur(${l.blur}px)`;
      ctx.fillStyle = l.color;
      if (l.type === "rect") {
        ctx.beginPath();
        ctx.roundRect(-l.w / 2, -l.h / 2, l.w, l.h, Math.min(l.radius, l.w / 2, l.h / 2));
        ctx.fill();
      } else if (l.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(0, 0, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (l.type === "text") {
        ctx.font = `${l.fontWeight} ${l.fontSize}px system-ui, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = l.text.split("\n");
        const lh = l.fontSize * 1.2;
        lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lh));
      } else if (l.src) {
        let img = imgs.current.get(l.src);
        if (!img) {
          img = new Image();
          img.onload = () => draw(time);
          img.src = l.src;
          imgs.current.set(l.src, img);
        }
        if (img.complete && img.naturalWidth) ctx.drawImage(img, -l.w / 2, -l.h / 2, l.w, l.h);
      }
      ctx.restore();
    }
  }

  useEffect(() => {
    live.current = { comp, loop };
    if (!clock.current) draw(t, comp);
  });

  // ---------- transport ----------

  function play(once?: () => void) {
    const start = once ? 0 : t >= comp.duration - 0.01 ? 0 : t;
    clock.current = { wall: now(), t: start, once };
    setPlaying(true);
    const tick = () => {
      const c = clock.current;
      if (!c) return;
      let elapsed = c.t + (now() - c.wall) / 1000;
      const { comp: cp, loop: lp } = live.current;
      if (elapsed >= cp.duration) {
        if (lp && !c.once) {
          clock.current = { wall: now(), t: 0 };
          elapsed = 0;
        } else {
          draw(cp.duration - 1e-3);
          setT(cp.duration);
          clock.current = null;
          setPlaying(false);
          c.once?.();
          return;
        }
      }
      setT(elapsed);
      draw(elapsed);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function pause() {
    clock.current = null;
    setPlaying(false);
  }

  function seek(v: number) {
    const nt = clamp(Math.round(v * FPS) / FPS, 0, comp.duration);
    if (clock.current) clock.current = { ...clock.current, wall: now(), t: nt };
    setT(nt);
  }

  // ---------- editing ----------

  function patchLayer(id: string, fn: (l: MLayer) => MLayer, commit = true) {
    hist.set((c) => ({ ...c, layers: c.layers.map((l) => (l.id === id ? fn(l) : l)) }), commit);
  }

  function addLayer(type: MLayer["type"], extra: Partial<MLayer> = {}) {
    const l = newLayer(type, comp, { inPoint: 0, ...extra });
    hist.set((c) => ({ ...c, layers: [...c.layers, l] }));
    setSelected(l.id);
  }

  async function addImage(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const src = await readAsDataURL(f);
      const img = await loadImage(src);
      const fit = Math.min(1, (comp.width * 0.6) / img.naturalWidth, (comp.height * 0.6) / img.naturalHeight);
      addLayer("image", { name: f.name, src, w: img.naturalWidth * fit, h: img.naturalHeight * fit });
    } catch {
      setError("Couldn't read that image.");
    }
  }

  function toggleStopwatch(p: Prop) {
    if (!sel) return;
    patchLayer(sel.id, (l) => {
      if (l.keys[p]?.length) {
        const keys = { ...l.keys };
        delete keys[p];
        return { ...l, base: { ...l.base, [p]: valueAt(l, p, t) }, keys };
      }
      return { ...l, keys: { ...l.keys, [p]: [{ id: uid("k"), t, v: l.base[p], ease: "easeInOut" }] } };
    });
  }

  function applyPreset(name: string) {
    if (!sel) return;
    const t0 = Math.max(t, sel.inPoint);
    patchLayer(sel.id, (l) => {
      const at = (p: Prop) => valueAt(l, p, t0);
      switch (name) {
        case "Fade in":
          return withKeys(l, "opacity", [[t0, 0], [t0 + 0.6, at("opacity") || 100]]);
        case "Fade out":
          return withKeys(l, "opacity", [[l.outPoint - 0.6, at("opacity") || 100], [l.outPoint - 1 / FPS, 0]]);
        case "Slide in": {
          const x = at("x");
          return withKeys(l, "x", [[t0, -comp.width * 0.25], [t0 + 0.8, x]]);
        }
        case "Rise up": {
          const y = at("y");
          return withKeys(withKeys(l, "y", [[t0, y + 160], [t0 + 0.8, y]]), "opacity", [[t0, 0], [t0 + 0.5, 100]]);
        }
        case "Pop":
          return withKeys(l, "scale", [[t0, 0], [t0 + 0.35, 115, "easeInOut"], [t0 + 0.55, 100]]);
        case "Spin":
          return withKeys(l, "rotation", [[l.inPoint, 0, "linear"], [l.outPoint, 360]]);
        case "Pulse":
          return withKeys(
            l,
            "scale",
            Array.from({ length: Math.floor((l.outPoint - t0) / 0.5) + 1 }, (_, i): [number, number, Ease] => [t0 + i * 0.5, i % 2 ? 108 : 100, "easeInOut"]),
          );
        default:
          return l;
      }
    });
  }

  function deleteSelection() {
    if (selKey && sel) {
      patchLayer(sel.id, (l) => {
        const keys = (l.keys[selKey.prop] ?? []).filter((k) => k.id !== selKey.id);
        const next = { ...l.keys, [selKey.prop]: keys };
        if (!keys.length) {
          delete next[selKey.prop];
          return { ...l, keys: next, base: { ...l.base, [selKey.prop]: valueAt(l, selKey.prop, t) } };
        }
        return { ...l, keys: next };
      });
      setSelKey(null);
    } else if (sel) {
      hist.set((c) => ({ ...c, layers: c.layers.filter((l) => l.id !== sel.id) }));
      setSelected(null);
    }
  }

  function reorder(dir: 1 | -1) {
    if (!sel) return;
    hist.set((c) => {
      const i = c.layers.findIndex((l) => l.id === sel.id);
      const j = i + dir;
      if (j < 0 || j >= c.layers.length) return c;
      const layers = [...c.layers];
      [layers[i], layers[j]] = [layers[j], layers[i]];
      return { ...c, layers };
    });
  }

  function duplicateLayer() {
    if (!sel) return;
    const copy = { ...sel, id: uid("l"), name: `${sel.name} copy` };
    hist.set((c) => ({ ...c, layers: [...c.layers, copy] }));
    setSelected(copy.id);
  }

  // ---------- canvas pointer ----------

  function canvasPt(e: { clientX: number; clientY: number }) {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * cv.width) / r.width, y: ((e.clientY - r.top) * cv.height) / r.height };
  }

  function hitTest(x: number, y: number): MLayer | null {
    const ctx = canvasRef.current!.getContext("2d")!;
    for (let i = comp.layers.length - 1; i >= 0; i--) {
      const l = comp.layers[i];
      if (l.hidden || t < l.inPoint || t >= l.outPoint) continue;
      const s = valueAt(l, "scale", t) / 100 || 1e-6;
      const r = (-valueAt(l, "rotation", t) * Math.PI) / 180;
      const dx = x - valueAt(l, "x", t);
      const dy = y - valueAt(l, "y", t);
      const lx = (dx * Math.cos(r) - dy * Math.sin(r)) / s;
      const ly = (dx * Math.sin(r) + dy * Math.cos(r)) / s;
      const [w, h] = layerSize(l, ctx);
      if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return l;
    }
    return null;
  }

  function onCanvasDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = canvasPt(e);
    const hit = hitTest(p.x, p.y);
    setSelected(hit?.id ?? null);
    setSelKey(null);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind: "canvas", id: hit.id, dx: p.x - valueAt(hit, "x", t), dy: p.y - valueAt(hit, "y", t) });
  }

  function onCanvasMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (drag?.kind !== "canvas") return;
    const p = canvasPt(e);
    patchLayer(drag.id, (l) => setValue(setValue(l, "x", t, Math.round(p.x - drag.dx)), "y", t, Math.round(p.y - drag.dy)), false);
  }

  // ---------- timeline pointer ----------

  function laneTime(clientX: number) {
    const r = laneRef.current!.getBoundingClientRect();
    return (clientX - r.left) / pps;
  }

  function onTimelineMove(e: ReactPointerEvent<HTMLElement>) {
    if (!drag) return;
    if (drag.kind === "scrub") {
      seek(laneTime(e.clientX));
    } else if (drag.kind === "bar" || drag.kind === "barL" || drag.kind === "barR") {
      const dt = Math.round(((e.clientX - drag.x0) / pps) * FPS) / FPS;
      const o = drag.orig;
      patchLayer(
        drag.id,
        (l) => {
          if (drag.kind === "barL") return { ...l, inPoint: clamp(o.inPoint + dt, 0, o.outPoint - 1 / FPS) };
          if (drag.kind === "barR") return { ...l, outPoint: clamp(o.outPoint + dt, o.inPoint + 1 / FPS, comp.duration) };
          const shift = clamp(dt, -o.inPoint, comp.duration - o.outPoint);
          const keys = Object.fromEntries(Object.entries(o.keys).map(([p, ks]) => [p, ks!.map((k) => ({ ...k, t: k.t + shift }))]));
          return { ...l, inPoint: o.inPoint + shift, outPoint: o.outPoint + shift, keys };
        },
        false,
      );
    } else if (drag.kind === "key") {
      const nt = clamp(Math.round((drag.t0 + (e.clientX - drag.x0) / pps) * FPS) / FPS, 0, comp.duration);
      patchLayer(
        drag.id,
        (l) => ({
          ...l,
          keys: { ...l.keys, [drag.prop]: (l.keys[drag.prop] ?? []).map((k) => (k.id === drag.keyId ? { ...k, t: nt } : k)).sort((a, b) => a.t - b.t) },
        }),
        false,
      );
    }
  }

  function endDrag() {
    if (drag && drag.kind !== "scrub") hist.commit();
    setDrag(null);
  }

  // ---------- export ----------

  async function exportVideo() {
    if (!canvasRef.current) return;
    pause();
    setExporting(true);
    try {
      const blob = await recordCanvas(canvasRef.current, () => new Promise<void>((resolve) => play(resolve)), undefined, FPS);
      downloadBlob(blob, "motion.webm");
    } catch {
      setError("Export failed. Your browser may not support MediaRecorder.");
    } finally {
      setExporting(false);
    }
  }

  function exportFrame() {
    draw(t);
    canvasRef.current?.toBlob((b) => b && downloadBlob(b, `frame-${t.toFixed(2)}s.png`), "image/png");
  }

  useKeys((e) => {
    if (exporting) return;
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    if (e.metaKey || e.ctrlKey) return;
    if (e.key === " ") {
      e.preventDefault();
      if (playing) pause();
      else play();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelection();
    } else if (e.key === "ArrowLeft") seek(t - (e.shiftKey ? 10 : 1) / FPS);
    else if (e.key === "ArrowRight") seek(t + (e.shiftKey ? 10 : 1) / FPS);
    else if (e.key === "Home") seek(0);
  });

  const selectedKey = sel && selKey ? sel.keys[selKey.prop]?.find((k) => k.id === selKey.id) : undefined;
  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={addImage} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Motion" replaces="After Effects" blurb="Animate text, shapes and images with keyframes and easing. Renders to WebM in your browser.">
          <button className={btn} onClick={() => addLayer("text")}>
            <Type size={14} /> Text
          </button>
          <button className={btn} onClick={() => addLayer("rect")}>
            <Square size={14} /> Rect
          </button>
          <button className={btn} onClick={() => addLayer("ellipse")}>
            <Circle size={14} /> Ellipse
          </button>
          <button className={btn} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={14} /> Image
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo">
            <Undo2 size={14} />
          </button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo">
            <Redo2 size={14} />
          </button>
          <button className={btn} onClick={exportFrame}>
            <Download size={14} /> PNG frame
          </button>
          <button className={btnPrimary} disabled={exporting} onClick={exportVideo}>
            <Download size={14} /> {exporting ? `Rendering ${formatTime(t)}` : "Export WebM"}
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-center bg-[#0A0D12]" style={{ height: "min(48vh, 560px)" }}>
              <canvas
                ref={canvasRef}
                width={comp.width}
                height={comp.height}
                onPointerDown={onCanvasDown}
                onPointerMove={onCanvasMove}
                onPointerUp={endDrag}
                className="max-h-full max-w-full touch-none"
                style={{ aspectRatio: `${comp.width} / ${comp.height}` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className={iconBtn} onClick={() => seek(0)} title="Start">
                <SkipBack size={14} />
              </button>
              <button className={btnPrimary} onClick={() => (playing ? pause() : play())} disabled={exporting}>
                {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Play"}
              </button>
              <button className={`${iconBtn} ${loop ? "border-accent text-accent" : ""}`} onClick={() => setLoop((v) => !v)} title="Loop playback">
                <Repeat size={14} />
              </button>
              <span className="font-mono text-xs tabular-nums text-slate-300">
                {formatTime(t)} / {formatTime(comp.duration)}
              </span>
              <span className="text-xs text-slate-500">Drag layers on the canvas · Space play · ←/→ frame</span>
            </div>
          </div>

          <aside className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
            {sel ? (
              <Panel title={sel.name}>
                <div className="flex flex-col gap-3">
                  <input className={inputCls} value={sel.name} onChange={(e) => patchLayer(sel.id, (l) => ({ ...l, name: e.target.value }), false)} aria-label="Layer name" />
                  {sel.type === "text" && (
                    <textarea className={inputCls} rows={2} value={sel.text} onChange={(e) => patchLayer(sel.id, (l) => ({ ...l, text: e.target.value }), false)} />
                  )}
                  {sel.type !== "image" && (
                    <div className="flex items-center gap-2">
                      <input type="color" value={sel.color} onChange={(e) => patchLayer(sel.id, (l) => ({ ...l, color: e.target.value }), false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Color" />
                      {sel.type === "text" && (
                        <select className={`${inputCls} flex-1`} value={sel.fontWeight} onChange={(e) => patchLayer(sel.id, (l) => ({ ...l, fontWeight: Number(e.target.value) }))}>
                          <option value={400}>Regular</option>
                          <option value={600}>Semibold</option>
                          <option value={800}>Heavy</option>
                        </select>
                      )}
                    </div>
                  )}
                  {sel.type === "text" ? (
                    <Slider label="Font size" value={sel.fontSize} min={12} max={400} unit="px" onChange={(v) => patchLayer(sel.id, (l) => ({ ...l, fontSize: v }), false)} />
                  ) : (
                    <>
                      <Slider label="Width" value={Math.round(sel.w)} min={4} max={comp.width * 1.5} unit="px" onChange={(v) => patchLayer(sel.id, (l) => ({ ...l, w: v }), false)} />
                      <Slider label="Height" value={Math.round(sel.h)} min={4} max={comp.height * 1.5} unit="px" onChange={(v) => patchLayer(sel.id, (l) => ({ ...l, h: v }), false)} />
                      {sel.type === "rect" && <Slider label="Corner radius" value={sel.radius} min={0} max={400} unit="px" onChange={(v) => patchLayer(sel.id, (l) => ({ ...l, radius: v }), false)} />}
                    </>
                  )}
                  <span className={labelCls}>Transform at {formatTime(t)}</span>
                  {PROPS.map((p) => (
                    <div key={p.id} className="flex items-end gap-2">
                      <button
                        onClick={() => toggleStopwatch(p.id)}
                        title={sel.keys[p.id]?.length ? "Stop animating (keeps current value)" : "Animate this property"}
                        className={`mb-0.5 ${sel.keys[p.id]?.length ? "text-accent" : "text-slate-600 hover:text-slate-300"}`}
                      >
                        <Timer size={14} />
                      </button>
                      <div className="flex-1">
                        <Slider label={p.label} value={Math.round(valueAt(sel, p.id, t))} min={p.min} max={p.max} unit={p.unit} onChange={(v) => patchLayer(sel.id, (l) => setValue(l, p.id, t, v), false)} />
                      </div>
                    </div>
                  ))}
                  <span className={labelCls}>Effects</span>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={sel.shadow} onChange={(e) => patchLayer(sel.id, (l) => ({ ...l, shadow: e.target.checked }))} className="accent-teal-500" /> Drop shadow
                  </label>
                  <Slider label="Blur" value={sel.blur} min={0} max={40} unit="px" onChange={(v) => patchLayer(sel.id, (l) => ({ ...l, blur: v }), false)} />
                  <span className={labelCls}>Animation presets (from playhead)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Fade in", "Fade out", "Slide in", "Rise up", "Pop", "Spin", "Pulse"].map((n) => (
                      <button key={n} onClick={() => applyPreset(n)} className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent hover:text-white">
                        {n}
                      </button>
                    ))}
                  </div>
                  {selectedKey && selKey && (
                    <div className="flex items-center gap-2 rounded-md border border-slate-700 p-2">
                      <span className="text-xs text-slate-400">Keyframe easing</span>
                      <select
                        className={`${inputCls} flex-1 py-1 text-xs`}
                        value={selectedKey.ease}
                        onChange={(e) =>
                          patchLayer(sel.id, (l) => ({
                            ...l,
                            keys: { ...l.keys, [selKey.prop]: (l.keys[selKey.prop] ?? []).map((k) => (k.id === selKey.id ? { ...k, ease: e.target.value as Ease } : k)) },
                          }))
                        }
                      >
                        {EASES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button className={iconBtn} onClick={() => reorder(1)} title="Bring forward"><ArrowUp size={14} /></button>
                    <button className={iconBtn} onClick={() => reorder(-1)} title="Send backward"><ArrowDown size={14} /></button>
                    <button className={iconBtn} onClick={duplicateLayer} title="Duplicate"><Copy size={14} /></button>
                    <button className={btn} onClick={deleteSelection}><Trash2 size={14} /> {selKey ? "Delete key" : "Delete layer"}</button>
                  </div>
                </div>
              </Panel>
            ) : (
              <Panel title="Composition">
                <div className="flex flex-col gap-3">
                  <select
                    className={inputCls}
                    value={`${comp.width}x${comp.height}`}
                    onChange={(e) => {
                      const s = COMP_SIZES.find((c) => `${c.w}x${c.h}` === e.target.value);
                      if (s) hist.set((c) => ({ ...c, width: s.w, height: s.h }));
                    }}
                  >
                    {COMP_SIZES.map((s) => (
                      <option key={s.label} value={`${s.w}x${s.h}`}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Slider label="Duration" value={comp.duration} min={1} max={30} step={0.5} unit="s" onChange={(v) => hist.set((c) => ({ ...c, duration: v, layers: c.layers.map((l) => ({ ...l, outPoint: Math.min(l.outPoint === c.duration ? v : l.outPoint, v) })) }), false)} />
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    Background
                    <input type="color" value={comp.background} onChange={(e) => hist.set((c) => ({ ...c, background: e.target.value }), false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" />
                  </label>
                  <p className="text-xs text-slate-500">Click a layer on the canvas or timeline to edit it. Turn on a property&apos;s stopwatch to animate it, then move the playhead and change the value.</p>
                </div>
              </Panel>
            )}
          </aside>
        </div>

        {/* Timeline */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 select-none" onPointerMove={onTimelineMove} onPointerUp={endDrag}>
          <div className="relative" style={{ minWidth: LABEL_W + 900 + 24 }}>
            <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-500" style={{ left: LABEL_W + t * pps }} />
            <div className="flex border-b border-slate-800">
              <div className="shrink-0 border-r border-slate-800 px-2 py-1 text-[11px] text-slate-500" style={{ width: LABEL_W }}>
                Layers
              </div>
              <div
                ref={laneRef}
                className="relative h-6 cursor-pointer"
                style={{ width: 900 }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ kind: "scrub" });
                  seek(laneTime(e.clientX));
                }}
              >
                {Array.from({ length: Math.floor(comp.duration) + 1 }, (_, s) => (
                  <span key={s} className="absolute top-0 h-full border-l border-slate-700 pl-1 font-mono text-[9px] text-slate-500" style={{ left: s * pps }}>
                    {s}s
                  </span>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden">
              {[...comp.layers].reverse().map((l) => {
                const isSel = l.id === selected;
                const animated = PROPS.filter((p) => l.keys[p.id]?.length);
                return (
                  <div key={l.id} className="border-b border-slate-800">
                    <div className="flex">
                      <div className={`flex shrink-0 items-center gap-2 border-r border-slate-800 px-2 py-1.5 text-xs ${isSel ? "bg-accent/15 text-white" : "text-slate-300"}`} style={{ width: LABEL_W }}>
                        <button onClick={() => patchLayer(l.id, (x) => ({ ...x, hidden: !x.hidden }))} className="text-slate-500 hover:text-white" aria-label={l.hidden ? "Show" : "Hide"}>
                          {l.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button className="min-w-0 flex-1 truncate text-left" onClick={() => { setSelected(l.id); setSelKey(null); }}>
                          {l.name}
                        </button>
                      </div>
                      <div className="relative h-8" style={{ width: 900 }}>
                        <div
                          onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setSelected(l.id);
                            setSelKey(null);
                            setDrag({ kind: "bar", id: l.id, x0: e.clientX, orig: l });
                          }}
                          className={`absolute top-1.5 bottom-1.5 cursor-grab rounded ${isSel ? "bg-teal-600" : "bg-slate-700"}`}
                          style={{ left: l.inPoint * pps, width: Math.max(4, (l.outPoint - l.inPoint) * pps) }}
                        >
                          <div onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ kind: "barL", id: l.id, x0: e.clientX, orig: l }); }} className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize hover:bg-white/40" />
                          <div onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ kind: "barR", id: l.id, x0: e.clientX, orig: l }); }} className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-white/40" />
                        </div>
                      </div>
                    </div>
                    {isSel &&
                      animated.map((p) => (
                        <div key={p.id} className="flex bg-slate-950/40">
                          <div className="shrink-0 border-r border-slate-800 py-1 pr-2 pl-7 text-[11px] text-slate-400" style={{ width: LABEL_W }}>
                            {p.label}
                          </div>
                          <div className="relative h-6" style={{ width: 900 }}>
                            {l.keys[p.id]!.map((k) => (
                              <button
                                key={k.id}
                                title={`${formatTime(k.t)} · ${Math.round(k.v)}${p.unit} · ${k.ease}`}
                                onPointerDown={(e) => {
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                  setSelKey({ prop: p.id, id: k.id });
                                  seek(k.t);
                                  setDrag({ kind: "key", id: l.id, prop: p.id, keyId: k.id, x0: e.clientX, t0: k.t });
                                }}
                                className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border ${selKey?.id === k.id ? "border-white bg-amber-400" : "border-amber-200 bg-amber-500/80"}`}
                                style={{ left: k.t * pps }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
