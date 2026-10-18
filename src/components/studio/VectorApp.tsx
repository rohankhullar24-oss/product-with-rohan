"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  Circle,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus,
  ImagePlus,
  Maximize,
  Minus,
  MousePointer2,
  PenTool,
  Pencil,
  Redo2,
  SendToBack,
  Square,
  Star,
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

// An SVG editor. The document is plain JSON rendered straight into <svg>, so
// "export SVG" is just serializing the artwork group.

type Tool = "select" | "rect" | "ellipse" | "polygon" | "line" | "pen" | "pencil" | "text";

type Paint = { kind: "none" | "solid" | "linear"; color: string; color2: string; angle: number };

type Box = { x: number; y: number; w: number; h: number };

type PathNode = { x: number; y: number; hx: number; hy: number };

type Base = {
  id: string;
  name: string;
  fill: Paint;
  strokeOn: boolean;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  hidden?: boolean;
};

type Shape = Base &
  (
    | { type: "rect"; x: number; y: number; w: number; h: number; rx: number }
    | { type: "ellipse"; x: number; y: number; w: number; h: number }
    | { type: "polygon"; x: number; y: number; w: number; h: number; sides: number; star: boolean }
    | { type: "image"; x: number; y: number; w: number; h: number; href: string }
    | { type: "line"; x1: number; y1: number; x2: number; y2: number }
    | { type: "path"; nodes: PathNode[]; closed: boolean }
    | { type: "compound"; d: string; box0: Box; box: Box }
    | { type: "text"; x: number; y: number; text: string; size: number; font: string; weight: number }
  );

type VDoc = { width: number; height: number; background: string; shapes: Shape[] };

type Drag =
  | { kind: "move"; start: Pt; orig: Shape[] }
  | { kind: "resize"; handle: string; box0: Box; orig: Shape[] }
  | { kind: "marquee"; start: Pt; cur: Pt; additive: boolean }
  | { kind: "create"; id: string; start: Pt }
  | { kind: "pencil"; id: string; pts: Pt[] }
  | { kind: "penHandle"; id: string };

type Pt = { x: number; y: number };

const FONTS = [
  { label: "Sans", css: "Helvetica, Arial, sans-serif" },
  { label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", css: "'Courier New', monospace" },
  { label: "Display", css: "Impact, 'Arial Black', sans-serif" },
];

const ARTBOARDS = [
  { label: "1200 × 800", w: 1200, h: 800 },
  { label: "Square 1080", w: 1080, h: 1080 },
  { label: "Story 1080 × 1920", w: 1080, h: 1920 },
  { label: "A4 (794 × 1123)", w: 794, h: 1123 },
  { label: "Icon 512", w: 512, h: 512 },
];

const TOOLS: { id: Tool; label: string; key: string; icon: ReactNode }[] = [
  { id: "select", label: "Select", key: "V", icon: <MousePointer2 size={18} /> },
  { id: "pen", label: "Pen", key: "P", icon: <PenTool size={18} /> },
  { id: "pencil", label: "Pencil", key: "N", icon: <Pencil size={18} /> },
  { id: "rect", label: "Rectangle", key: "M", icon: <Square size={18} /> },
  { id: "ellipse", label: "Ellipse", key: "L", icon: <Circle size={18} /> },
  { id: "polygon", label: "Polygon / star", key: "Y", icon: <Star size={18} /> },
  { id: "line", label: "Line", key: "\\", icon: <Minus size={18} /> },
  { id: "text", label: "Text", key: "T", icon: <Type size={18} /> },
];

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const solid = (color: string): Paint => ({ kind: "solid", color, color2: "#0f172a", angle: 90 });
const noPaint: Paint = { kind: "none", color: "#14b8a6", color2: "#0f172a", angle: 90 };

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(s: Extract<Shape, { type: "text" }>) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return s.text.length * s.size * 0.6;
  measureCtx.font = `${s.weight} ${s.size}px ${s.font}`;
  return Math.max(...s.text.split("\n").map((l) => measureCtx!.measureText(l).width), s.size * 0.3);
}

function bbox(s: Shape): Box {
  switch (s.type) {
    case "rect":
    case "ellipse":
    case "polygon":
    case "image":
      return { x: s.x, y: s.y, w: s.w, h: s.h };
    case "line":
      return {
        x: Math.min(s.x1, s.x2),
        y: Math.min(s.y1, s.y2),
        w: Math.abs(s.x2 - s.x1),
        h: Math.abs(s.y2 - s.y1),
      };
    case "path": {
      const xs = s.nodes.map((n) => n.x);
      const ys = s.nodes.map((n) => n.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    case "compound":
      return s.box;
    case "text":
      return { x: s.x, y: s.y, w: textWidth(s), h: s.size * 1.2 * s.text.split("\n").length };
  }
}

function unionBox(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
}

/** Linearly maps a shape's geometry from one box onto another. */
function mapShape(s: Shape, from: Box, to: Box): Shape {
  const sx = from.w ? to.w / from.w : 1;
  const sy = from.h ? to.h / from.h : 1;
  const mx = (x: number) => to.x + (x - from.x) * sx;
  const my = (y: number) => to.y + (y - from.y) * sy;
  switch (s.type) {
    case "rect":
    case "ellipse":
    case "polygon":
    case "image": {
      const x0 = mx(s.x);
      const y0 = my(s.y);
      const x1 = mx(s.x + s.w);
      const y1 = my(s.y + s.h);
      const geo = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      if (s.type === "rect") return { ...s, ...geo, rx: s.rx * Math.min(Math.abs(sx), Math.abs(sy)) };
      return { ...s, ...geo };
    }
    case "line":
      return { ...s, x1: mx(s.x1), y1: my(s.y1), x2: mx(s.x2), y2: my(s.y2) };
    case "path":
      return { ...s, nodes: s.nodes.map((n) => ({ x: mx(n.x), y: my(n.y), hx: n.hx * sx, hy: n.hy * sy })) };
    case "compound": {
      const x0 = mx(s.box.x);
      const y0 = my(s.box.y);
      const x1 = mx(s.box.x + s.box.w);
      const y1 = my(s.box.y + s.box.h);
      return { ...s, box: { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) } };
    }
    case "text":
      return { ...s, x: mx(s.x), y: my(s.y), size: Math.max(4, s.size * Math.abs(sy)) };
  }
}

function translate(s: Shape, dx: number, dy: number): Shape {
  const b = bbox(s);
  return mapShape(s, b, { ...b, x: b.x + dx, y: b.y + dy });
}

function nodesD(nodes: PathNode[], closed: boolean) {
  if (!nodes.length) return "";
  const seg = (a: PathNode, b: PathNode) =>
    a.hx || a.hy || b.hx || b.hy
      ? `C${a.x + a.hx} ${a.y + a.hy} ${b.x - b.hx} ${b.y - b.hy} ${b.x} ${b.y}`
      : `L${b.x} ${b.y}`;
  let d = `M${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) d += seg(nodes[i - 1], nodes[i]);
  if (closed && nodes.length > 2) d += `${seg(nodes[nodes.length - 1], nodes[0])}Z`;
  return d;
}

function polygonPoints(s: Extract<Shape, { type: "polygon" }>) {
  const n = clamp(Math.round(s.sides), 3, 24);
  const count = s.star ? n * 2 : n;
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / count;
    const r = s.star && i % 2 ? 0.45 : 1;
    pts.push({ x: cx + (Math.cos(a) * s.w * r) / 2, y: cy + (Math.sin(a) * s.h * r) / 2 });
  }
  return pts;
}

/** Path data for shapes that can take part in boolean operations. */
function shapeD(s: Shape): string | null {
  switch (s.type) {
    case "rect":
      return `M${s.x} ${s.y}H${s.x + s.w}V${s.y + s.h}H${s.x}Z`;
    case "ellipse": {
      const rx = s.w / 2;
      const ry = s.h / 2;
      const cx = s.x + rx;
      const cy = s.y + ry;
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case "polygon":
      return `M${polygonPoints(s).map((p) => `${p.x} ${p.y}`).join("L")}Z`;
    case "path":
      return s.nodes.length > 2 ? nodesD(s.nodes, true) : null;
    case "compound":
      return s.d;
    default:
      return null;
  }
}

function paintAttr(p: Paint, id: string) {
  if (p.kind === "none") return "none";
  if (p.kind === "solid") return p.color;
  return `url(#grad-${id})`;
}

function ShapeEl({ s }: { s: Shape }) {
  const b = bbox(s);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const common = {
    fill: paintAttr(s.fill, s.id),
    stroke: s.strokeOn ? s.stroke : "none",
    strokeWidth: s.strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let el: ReactNode;
  switch (s.type) {
    case "rect":
      el = <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} />;
      break;
    case "ellipse":
      el = <ellipse cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} {...common} />;
      break;
    case "polygon":
      el = <polygon points={polygonPoints(s).map((p) => `${p.x},${p.y}`).join(" ")} {...common} />;
      break;
    case "image":
      el = <image href={s.href} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="none" />;
      break;
    case "line":
      el = <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...common} stroke={s.stroke} />;
      break;
    case "path":
      el = <path d={nodesD(s.nodes, s.closed)} {...common} />;
      break;
    case "compound": {
      const sx = s.box0.w ? s.box.w / s.box0.w : 1;
      const sy = s.box0.h ? s.box.h / s.box0.h : 1;
      const m = `matrix(${sx} 0 0 ${sy} ${s.box.x - s.box0.x * sx} ${s.box.y - s.box0.y * sy})`;
      el = <path d={s.d} transform={m} fillRule="evenodd" {...common} strokeWidth={s.strokeWidth / Math.max(sx, sy)} />;
      break;
    }
    case "text":
      el = (
        <text
          x={s.x}
          y={s.y + s.size}
          fontSize={s.size}
          fontFamily={s.font}
          fontWeight={s.weight}
          {...common}
          style={{ whiteSpace: "pre" }}
        >
          {s.text.split("\n").map((line, i) => (
            <tspan key={i} x={s.x} dy={i === 0 ? 0 : s.size * 1.2}>
              {line || " "}
            </tspan>
          ))}
        </text>
      );
      break;
  }
  return (
    <g
      data-id={s.id}
      opacity={s.opacity}
      transform={s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined}
      display={s.hidden ? "none" : undefined}
    >
      {s.fill.kind === "linear" && (
        <defs>
          <linearGradient id={`grad-${s.id}`} gradientTransform={`rotate(${s.fill.angle - 90} 0.5 0.5)`}>
            <stop offset="0" stopColor={s.fill.color} />
            <stop offset="1" stopColor={s.fill.color2} />
          </linearGradient>
        </defs>
      )}
      {el}
    </g>
  );
}

function newBase(name: string, fill: Paint, stroke: string, strokeOn: boolean, strokeWidth: number): Base {
  return { id: uid("s"), name, fill, stroke, strokeOn, strokeWidth, opacity: 1, rotation: 0 };
}

function starterDoc(): VDoc {
  return {
    width: 1200,
    height: 800,
    background: "#ffffff",
    shapes: [
      {
        ...newBase("Sun", { kind: "linear", color: "#fbbf24", color2: "#f97316", angle: 90 }, "#0f172a", false, 4),
        type: "ellipse",
        x: 760,
        y: 140,
        w: 260,
        h: 260,
      },
      {
        ...newBase("Hill", solid("#0d9488"), "#0f172a", false, 4),
        type: "path",
        closed: true,
        nodes: [
          { x: 0, y: 620, hx: 0, hy: 0 },
          { x: 420, y: 470, hx: 180, hy: 0 },
          { x: 1200, y: 600, hx: 0, hy: 0 },
          { x: 1200, y: 800, hx: 0, hy: 0 },
          { x: 0, y: 800, hx: 0, hy: 0 },
        ],
      },
      {
        ...newBase("Title", solid("#0f172a"), "#0f172a", false, 2),
        type: "text",
        x: 90,
        y: 120,
        text: "Draw something",
        size: 72,
        font: FONTS[0].css,
        weight: 700,
      },
    ],
  };
}

function simplify(pts: Pt[], tolerance: number): Pt[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let maxD = 0;
  let idx = 0;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b.y - a.y) * pts[i].x - (b.x - a.x) * pts[i].y + b.x * a.y - b.y * a.x) / len;
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= tolerance) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), tolerance).slice(0, -1), ...simplify(pts.slice(idx), tolerance)];
}

/** Turns a simplified polyline into a smooth path (Catmull-Rom style handles). */
function smoothNodes(pts: Pt[]): PathNode[] {
  return pts.map((p, i) => {
    const prev = pts[i - 1] ?? p;
    const next = pts[i + 1] ?? p;
    const k = i === 0 || i === pts.length - 1 ? 0 : 1 / 6;
    return { x: p.x, y: p.y, hx: (next.x - prev.x) * k, hy: (next.y - prev.y) * k };
  });
}

export default function VectorApp() {
  const hist = useHistory<VDoc>(starterDoc);
  const doc = hist.state;
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.6);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [penId, setPenId] = useState<string | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const [fill, setFill] = useState<Paint>(solid("#14b8a6"));
  const [stroke, setStroke] = useState({ on: true, color: "#0f172a", width: 4 });
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const sel = doc.shapes.filter((s) => selected.includes(s.id));
  const one = sel.length === 1 ? sel[0] : null;
  const selBox = sel.length ? unionBox(sel.map(bbox)) : null;

  function fitZoom(d: VDoc = doc) {
    const ws = wsRef.current;
    if (!ws) return;
    setZoom(clamp(Math.min((ws.clientWidth - 48) / d.width, (ws.clientHeight - 48) / d.height), 0.05, 4));
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => fitZoom());
    return () => cancelAnimationFrame(id);
    // Fit once on mount; later fits are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setShapes(fn: (shapes: Shape[]) => Shape[], commit = true) {
    hist.set((d) => ({ ...d, shapes: fn(d.shapes) }), commit);
  }

  function patchSelected(fn: (s: Shape) => Shape, commit = true) {
    setShapes((shapes) => shapes.map((s) => (selected.includes(s.id) ? fn(s) : s)), commit);
  }

  function toPt(e: { clientX: number; clientY: number }): Pt {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function finishPen(close = false) {
    if (!penId) return;
    const s = doc.shapes.find((x) => x.id === penId);
    if (s?.type === "path" && s.nodes.length < 2) {
      setShapes((shapes) => shapes.filter((x) => x.id !== penId));
    } else if (s?.type === "path" && close) {
      setShapes((shapes) => shapes.map((x) => (x.id === penId ? { ...s, closed: true } : x)));
    } else {
      hist.commit();
    }
    setPenId(null);
  }

  function chooseTool(t: Tool) {
    finishPen();
    setTool(t);
  }

  // ---------- pointer ----------

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPt(e);
    const target = e.target as Element;
    const handle = target.closest("[data-handle]")?.getAttribute("data-handle");
    const hitId = target.closest("[data-id]")?.getAttribute("data-id") ?? null;
    const hit = hitId ? doc.shapes.find((s) => s.id === hitId) : undefined;

    if (tool === "select") {
      if (handle && selBox) {
        setDrag({ kind: "resize", handle, box0: selBox, orig: sel });
        return;
      }
      if (hit) {
        let ids = selected;
        if (e.shiftKey) ids = selected.includes(hit.id) ? selected.filter((i) => i !== hit.id) : [...selected, hit.id];
        else if (!selected.includes(hit.id)) ids = [hit.id];
        setSelected(ids);
        setDrag({ kind: "move", start: p, orig: doc.shapes.filter((s) => ids.includes(s.id)) });
        return;
      }
      if (!e.shiftKey) setSelected([]);
      setDrag({ kind: "marquee", start: p, cur: p, additive: e.shiftKey });
      return;
    }

    if (tool === "text") {
      const s: Shape = {
        ...newBase("Text", fill.kind === "none" ? solid("#0f172a") : fill, stroke.color, false, 1),
        type: "text",
        x: p.x,
        y: p.y,
        text: "Text",
        size: 64,
        font: FONTS[0].css,
        weight: 700,
      };
      setShapes((shapes) => [...shapes, s]);
      setSelected([s.id]);
      setTool("select");
      return;
    }

    if (tool === "pen") {
      const cur = penId ? doc.shapes.find((s) => s.id === penId) : undefined;
      if (cur?.type === "path") {
        const first = cur.nodes[0];
        if (cur.nodes.length > 2 && Math.hypot(p.x - first.x, p.y - first.y) < 10 / zoom) {
          setShapes((shapes) => shapes.map((s) => (s.id === cur.id ? { ...cur, closed: true } : s)));
          setPenId(null);
          setSelected([cur.id]);
          return;
        }
        setShapes(
          (shapes) =>
            shapes.map((s) => (s.id === cur.id ? { ...cur, nodes: [...cur.nodes, { ...p, hx: 0, hy: 0 }] } : s)),
          false,
        );
        setDrag({ kind: "penHandle", id: cur.id });
      } else {
        const s: Shape = {
          ...newBase("Path", fill, stroke.color, stroke.on, stroke.width),
          type: "path",
          closed: false,
          nodes: [{ ...p, hx: 0, hy: 0 }],
        };
        setShapes((shapes) => [...shapes, s], false);
        setPenId(s.id);
        setSelected([s.id]);
        setDrag({ kind: "penHandle", id: s.id });
      }
      return;
    }

    if (tool === "pencil") {
      const s: Shape = {
        ...newBase("Pencil", noPaint, stroke.color, true, stroke.width),
        type: "path",
        closed: false,
        nodes: [{ ...p, hx: 0, hy: 0 }],
      };
      setShapes((shapes) => [...shapes, s], false);
      setDrag({ kind: "pencil", id: s.id, pts: [p] });
      return;
    }

    // Shape tools: drag out a box.
    const base = newBase(
      tool === "line" ? "Line" : tool[0].toUpperCase() + tool.slice(1),
      fill,
      stroke.color,
      tool === "line" ? true : stroke.on,
      stroke.width,
    );
    let s: Shape;
    if (tool === "rect") s = { ...base, type: "rect", x: p.x, y: p.y, w: 0, h: 0, rx: 0 };
    else if (tool === "ellipse") s = { ...base, type: "ellipse", x: p.x, y: p.y, w: 0, h: 0 };
    else if (tool === "polygon") s = { ...base, type: "polygon", x: p.x, y: p.y, w: 0, h: 0, sides: 5, star: true };
    else s = { ...base, type: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    setShapes((shapes) => [...shapes, s], false);
    setSelected([s.id]);
    setDrag({ kind: "create", id: s.id, start: p });
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = toPt(e);
    if (tool === "pen") setHover(p);
    if (!drag) return;
    if (drag.kind === "move") {
      let dx = p.x - drag.start.x;
      let dy = p.y - drag.start.y;
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const moved = new Map(drag.orig.map((s) => [s.id, translate(s, dx, dy)]));
      setShapes((shapes) => shapes.map((s) => moved.get(s.id) ?? s), false);
    } else if (drag.kind === "resize") {
      const b = drag.box0;
      let x0 = b.x;
      let y0 = b.y;
      let x1 = b.x + b.w;
      let y1 = b.y + b.h;
      if (drag.handle.includes("w")) x0 = p.x;
      if (drag.handle.includes("e")) x1 = p.x;
      if (drag.handle.includes("n")) y0 = p.y;
      if (drag.handle.includes("s")) y1 = p.y;
      let nb: Box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(1, Math.abs(x1 - x0)), h: Math.max(1, Math.abs(y1 - y0)) };
      if (e.shiftKey && b.w && b.h) {
        const scale = Math.max(nb.w / b.w, nb.h / b.h);
        nb = {
          x: drag.handle.includes("w") ? b.x + b.w - b.w * scale : b.x,
          y: drag.handle.includes("n") ? b.y + b.h - b.h * scale : b.y,
          w: b.w * scale,
          h: b.h * scale,
        };
      }
      const resized = new Map(drag.orig.map((s) => [s.id, mapShape(s, b, nb)]));
      setShapes((shapes) => shapes.map((s) => resized.get(s.id) ?? s), false);
    } else if (drag.kind === "marquee") {
      setDrag({ ...drag, cur: p });
    } else if (drag.kind === "create") {
      const { start } = drag;
      let w = p.x - start.x;
      let h = p.y - start.y;
      if (e.shiftKey) {
        const m = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * m;
        h = Math.sign(h || 1) * m;
      }
      setShapes(
        (shapes) =>
          shapes.map((s) => {
            if (s.id !== drag.id) return s;
            if (s.type === "line") return { ...s, x2: start.x + w, y2: start.y + h };
            if (s.type === "rect" || s.type === "ellipse" || s.type === "polygon")
              return { ...s, x: Math.min(start.x, start.x + w), y: Math.min(start.y, start.y + h), w: Math.abs(w), h: Math.abs(h) };
            return s;
          }),
        false,
      );
    } else if (drag.kind === "pencil") {
      const last = drag.pts[drag.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 2 / zoom) return;
      const pts = [...drag.pts, p];
      setDrag({ ...drag, pts });
      setShapes(
        (shapes) =>
          shapes.map((s) => (s.id === drag.id && s.type === "path" ? { ...s, nodes: pts.map((q) => ({ ...q, hx: 0, hy: 0 })) } : s)),
        false,
      );
    } else if (drag.kind === "penHandle") {
      setShapes(
        (shapes) =>
          shapes.map((s) => {
            if (s.id !== drag.id || s.type !== "path") return s;
            const nodes = [...s.nodes];
            const n = nodes[nodes.length - 1];
            nodes[nodes.length - 1] = { ...n, hx: (p.x - n.x) / 3, hy: (p.y - n.y) / 3 };
            return { ...s, nodes };
          }),
        false,
      );
    }
  }

  function onPointerUp() {
    if (!drag) return;
    if (drag.kind === "marquee") {
      const m = { x: Math.min(drag.start.x, drag.cur.x), y: Math.min(drag.start.y, drag.cur.y), w: Math.abs(drag.cur.x - drag.start.x), h: Math.abs(drag.cur.y - drag.start.y) };
      if (m.w > 2 || m.h > 2) {
        const hits = doc.shapes
          .filter((s) => !s.hidden)
          .filter((s) => {
            const b = bbox(s);
            return b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y;
          })
          .map((s) => s.id);
        setSelected((cur) => (drag.additive ? [...new Set([...cur, ...hits])] : hits));
      }
    } else if (drag.kind === "create") {
      const s = doc.shapes.find((x) => x.id === drag.id);
      if (s) {
        const b = bbox(s);
        if (b.w < 3 && b.h < 3) {
          // A click without a drag gets a default-sized shape.
          const fixed: Shape =
            s.type === "line"
              ? { ...s, x2: s.x1 + 160, y2: s.y1 }
              : s.type === "rect" || s.type === "ellipse" || s.type === "polygon"
                ? { ...s, w: 160, h: 160 }
                : s;
          setShapes((shapes) => shapes.map((x) => (x.id === s.id ? fixed : x)));
        } else hist.commit();
      }
    } else if (drag.kind === "pencil") {
      const pts = simplify(drag.pts, 1.5 / zoom);
      if (pts.length < 2) setShapes((shapes) => shapes.filter((s) => s.id !== drag.id));
      else
        setShapes((shapes) =>
          shapes.map((s) => (s.id === drag.id && s.type === "path" ? { ...s, nodes: smoothNodes(pts) } : s)),
        );
      setSelected([drag.id]);
    } else if (drag.kind === "penHandle") {
      // The pen path stays uncommitted until it's finished.
    } else {
      hist.commit();
    }
    setDrag(null);
  }

  // ---------- commands ----------

  function deleteSelected() {
    if (!selected.length) return;
    setShapes((shapes) => shapes.filter((s) => !selected.includes(s.id)));
    setSelected([]);
  }

  function duplicate() {
    if (!sel.length) return;
    const copies = sel.map((s) => ({ ...translate(s, 20, 20), id: uid("s"), name: `${s.name} copy` }));
    setShapes((shapes) => [...shapes, ...copies]);
    setSelected(copies.map((c) => c.id));
  }

  function arrange(where: "front" | "back" | "forward" | "backward") {
    if (!selected.length) return;
    setShapes((shapes) => {
      const picked = shapes.filter((s) => selected.includes(s.id));
      const rest = shapes.filter((s) => !selected.includes(s.id));
      if (where === "front") return [...rest, ...picked];
      if (where === "back") return [...picked, ...rest];
      const out = [...shapes];
      const order = where === "forward" ? [...out.keys()].reverse() : [...out.keys()];
      for (const i of order) {
        const j = where === "forward" ? i + 1 : i - 1;
        if (j < 0 || j >= out.length) continue;
        if (selected.includes(out[i].id) && !selected.includes(out[j].id)) [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    });
  }

  function align(how: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    if (!sel.length) return;
    const ref: Box = sel.length > 1 && selBox ? selBox : { x: 0, y: 0, w: doc.width, h: doc.height };
    patchSelected((s) => {
      const b = bbox(s);
      const dx =
        how === "left" ? ref.x - b.x : how === "right" ? ref.x + ref.w - b.x - b.w : how === "hcenter" ? ref.x + ref.w / 2 - b.x - b.w / 2 : 0;
      const dy =
        how === "top" ? ref.y - b.y : how === "bottom" ? ref.y + ref.h - b.y - b.h : how === "vcenter" ? ref.y + ref.h / 2 - b.y - b.h / 2 : 0;
      return translate(s, dx, dy);
    });
  }

  function distribute(axis: "x" | "y") {
    if (sel.length < 3) return;
    const sorted = [...sel].sort((a, b) => bbox(a)[axis] - bbox(b)[axis]);
    const boxes = sorted.map(bbox);
    const size = axis === "x" ? "w" : "h";
    const start = boxes[0][axis];
    const end = boxes[boxes.length - 1][axis] + boxes[boxes.length - 1][size];
    const total = boxes.reduce((t, b) => t + b[size], 0);
    const gap = (end - start - total) / (boxes.length - 1);
    let cursor = start;
    const moved = new Map<string, Shape>();
    sorted.forEach((s, i) => {
      const d = cursor - boxes[i][axis];
      moved.set(s.id, translate(s, axis === "x" ? d : 0, axis === "y" ? d : 0));
      cursor += boxes[i][size] + gap;
    });
    setShapes((shapes) => shapes.map((s) => moved.get(s.id) ?? s));
  }

  async function booleanOp(op: "unite" | "subtract" | "intersect" | "exclude") {
    const ordered = doc.shapes.filter((s) => selected.includes(s.id) && shapeD(s));
    if (ordered.length < 2) {
      setError("Select two or more closed shapes (rectangles, ellipses, polygons, closed paths).");
      return;
    }
    try {
      const paper = (await import("paper/dist/paper-core")).default;
      paper.setup(new paper.Size(1, 1));
      const toItem = (s: Shape) => {
        const item = new paper.CompoundPath(shapeD(s)!);
        if (s.type === "compound") item.bounds = new paper.Rectangle(s.box.x, s.box.y, s.box.w, s.box.h);
        if (s.rotation) item.rotate(s.rotation);
        return item;
      };
      // Bottom-most shape is the base; "subtract" removes everything above it.
      let result: paper.PathItem = toItem(ordered[0]);
      for (const s of ordered.slice(1)) {
        const next = toItem(s);
        result = result[op](next);
      }
      const d = result.pathData;
      const r = result.bounds;
      paper.project.clear();
      if (!d) {
        setError("That operation left nothing behind.");
        return;
      }
      const box = { x: r.x, y: r.y, w: r.width, h: r.height };
      const base = ordered[0];
      const shape: Shape = {
        ...newBase(op[0].toUpperCase() + op.slice(1), base.fill, base.stroke, base.strokeOn, base.strokeWidth),
        type: "compound",
        d,
        box0: box,
        box,
      };
      const firstIdx = doc.shapes.findIndex((s) => s.id === base.id);
      setShapes((shapes) => {
        const out = shapes.filter((s) => !ordered.some((o) => o.id === s.id));
        out.splice(Math.min(firstIdx, out.length), 0, shape);
        return out;
      });
      setSelected([shape.id]);
    } catch {
      setError("That boolean operation failed on these shapes.");
    }
  }

  // ---------- files ----------

  function serializeSvg(): string {
    const art = svgRef.current?.querySelector("#artwork");
    const inner = art ? art.innerHTML : "";
    const bg = doc.background === "transparent" ? "" : `<rect width="100%" height="100%" fill="${doc.background}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">${bg}${inner}</svg>`;
  }

  function exportSvg() {
    downloadBlob(new Blob([serializeSvg()], { type: "image/svg+xml" }), "artwork.svg");
  }

  async function exportPng() {
    const url = URL.createObjectURL(new Blob([serializeSvg()], { type: "image/svg+xml" }));
    try {
      const img = await loadImage(url);
      const c = document.createElement("canvas");
      c.width = doc.width * 2;
      c.height = doc.height * 2;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => b && downloadBlob(b, "artwork.png"), "image/png");
    } catch {
      setError("PNG export failed.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function placeImage(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const href = await readAsDataURL(f);
      const img = await loadImage(href);
      const scale = Math.min(1, (doc.width * 0.8) / img.naturalWidth, (doc.height * 0.8) / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const s: Shape = {
        ...newBase(f.name, noPaint, "#0f172a", false, 1),
        type: "image",
        href,
        x: (doc.width - w) / 2,
        y: (doc.height - h) / 2,
        w,
        h,
      };
      setShapes((shapes) => [...shapes, s]);
      setSelected([s.id]);
      setTool("select");
    } catch {
      setError("Couldn't read that image.");
    }
  }

  function newDoc(w: number, h: number) {
    const d = { width: w, height: h, background: "#ffffff", shapes: [] };
    hist.reset(d);
    setSelected([]);
    setPenId(null);
    requestAnimationFrame(() => fitZoom(d));
  }

  // ---------- keyboard ----------

  useKeys((e) => {
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicate();
      return;
    }
    if (mod && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setSelected(doc.shapes.filter((s) => !s.hidden).map((s) => s.id));
      return;
    }
    if (mod) return;
    if (e.key === "Enter" || e.key === "Escape") {
      if (penId) finishPen();
      else if (e.key === "Escape") setSelected([]);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
      return;
    }
    if (e.key.startsWith("Arrow") && selected.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      patchSelected((s) => translate(s, dx, dy));
      return;
    }
    const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
    if (t) chooseTool(t.id);
  });

  // ---------- render ----------

  const px = 1 / zoom;
  const penShape = penId ? doc.shapes.find((s) => s.id === penId) : undefined;
  const lastPen = penShape?.type === "path" ? penShape.nodes[penShape.nodes.length - 1] : undefined;
  const activePaint = one ? one.fill : fill;

  function setPaint(p: Paint) {
    if (sel.length) patchSelected((s) => ({ ...s, fill: p }));
    else setFill(p);
  }

  function setStrokeProps(patch: Partial<{ on: boolean; color: string; width: number }>, commit = true) {
    if (sel.length)
      patchSelected(
        (s) => ({
          ...s,
          strokeOn: patch.on ?? s.strokeOn,
          stroke: patch.color ?? s.stroke,
          strokeWidth: patch.width ?? s.strokeWidth,
        }),
        commit,
      );
    else setStroke((st) => ({ ...st, ...patch }));
  }

  const strokeState = one ? { on: one.strokeOn, color: one.stroke, width: one.strokeWidth } : stroke;
  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={placeImage} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Vector" replaces="Illustrator" blurb="Pen, pencil, shapes, text, gradients and boolean operations. Exports clean SVG.">
          <select
            className={inputCls}
            value=""
            onChange={(e) => {
              const a = ARTBOARDS[Number(e.target.value)];
              if (a) newDoc(a.w, a.h);
            }}
            aria-label="New document"
          >
            <option value="">New…</option>
            {ARTBOARDS.map((a, i) => (
              <option key={a.label} value={i}>
                {a.label}
              </option>
            ))}
          </select>
          <button className={btn} onClick={() => imgInputRef.current?.click()}>
            <ImagePlus size={14} /> Place image
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo">
            <Undo2 size={14} />
          </button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo">
            <Redo2 size={14} />
          </button>
          <button className={btn} onClick={exportSvg}>
            <Download size={14} /> SVG
          </button>
          <button className={btn} onClick={exportPng}>
            <Download size={14} /> PNG
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div className="grid gap-3 lg:grid-cols-[52px_minmax(0,1fr)_300px]">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-1.5 lg:flex-col">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={`${t.label} (${t.key})`}
                aria-label={t.label}
                aria-pressed={tool === t.id}
                onClick={() => chooseTool(t.id)}
                className={toolBtnCls(tool === t.id)}
              >
                {t.icon}
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1.5">
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z / 1.25, 0.05, 8))} title="Zoom out">
                <ZoomOut size={14} />
              </button>
              <span className="w-12 text-center font-mono text-xs tabular-nums text-slate-400">{Math.round(zoom * 100)}%</span>
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z * 1.25, 0.05, 8))} title="Zoom in">
                <ZoomIn size={14} />
              </button>
              <button className={iconBtn} onClick={() => fitZoom()} title="Fit">
                <Maximize size={14} />
              </button>
              {tool === "pen" && (
                <span className="text-xs text-slate-400">
                  Click to add points, drag for curves. Click the first point to close, Enter to finish.
                </span>
              )}
              <span className="ml-auto font-mono text-[11px] text-slate-500">
                {doc.width} × {doc.height}
              </span>
            </div>
            <div ref={wsRef} className="flex h-[60vh] overflow-auto bg-[#0A0D12] lg:h-[calc(100vh-260px)]">
              <div className="m-auto p-6">
                <svg
                  ref={svgRef}
                  width={doc.width * zoom}
                  height={doc.height * zoom}
                  viewBox={`0 0 ${doc.width} ${doc.height}`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onDoubleClick={() => penId && finishPen()}
                  onDragStart={(e) => e.preventDefault()}
                  className="block touch-none shadow-2xl shadow-black/50 select-none"
                  style={{
                    background:
                      doc.background === "transparent"
                        ? "repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%) 50% / 16px 16px"
                        : doc.background,
                    cursor: tool === "select" ? "default" : "crosshair",
                  }}
                >
                  <g id="artwork">
                    {doc.shapes.map((s) => (
                      <ShapeEl key={s.id} s={s} />
                    ))}
                  </g>
                  <g pointerEvents="none">
                    {sel.map((s) => {
                      const b = bbox(s);
                      return (
                        <rect
                          key={s.id}
                          x={b.x}
                          y={b.y}
                          width={b.w}
                          height={b.h}
                          fill="none"
                          stroke="#14b8a6"
                          strokeWidth={px}
                          transform={s.rotation ? `rotate(${s.rotation} ${b.x + b.w / 2} ${b.y + b.h / 2})` : undefined}
                        />
                      );
                    })}
                    {penShape?.type === "path" &&
                      penShape.nodes.map((n, i) => (
                        <rect key={i} x={n.x - 4 * px} y={n.y - 4 * px} width={8 * px} height={8 * px} fill="#fff" stroke="#14b8a6" strokeWidth={px} />
                      ))}
                    {lastPen && hover && !drag && (
                      <line x1={lastPen.x} y1={lastPen.y} x2={hover.x} y2={hover.y} stroke="#14b8a6" strokeWidth={px} strokeDasharray={`${4 * px} ${4 * px}`} />
                    )}
                    {drag?.kind === "marquee" && (
                      <rect
                        x={Math.min(drag.start.x, drag.cur.x)}
                        y={Math.min(drag.start.y, drag.cur.y)}
                        width={Math.abs(drag.cur.x - drag.start.x)}
                        height={Math.abs(drag.cur.y - drag.start.y)}
                        fill="rgba(20,184,166,0.08)"
                        stroke="#14b8a6"
                        strokeWidth={px}
                        strokeDasharray={`${4 * px} ${3 * px}`}
                      />
                    )}
                  </g>
                  {tool === "select" && selBox && !(one && one.rotation) && (
                    <g>
                      <rect x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h} fill="none" stroke="#14b8a6" strokeWidth={px} strokeDasharray={`${5 * px} ${3 * px}`} pointerEvents="none" />
                      {HANDLES.map((h) => {
                        const hx = h.includes("w") ? selBox.x : h.includes("e") ? selBox.x + selBox.w : selBox.x + selBox.w / 2;
                        const hy = h.includes("n") ? selBox.y : h.includes("s") ? selBox.y + selBox.h : selBox.y + selBox.h / 2;
                        return (
                          <rect
                            key={h}
                            data-handle={h}
                            x={hx - 5 * px}
                            y={hy - 5 * px}
                            width={10 * px}
                            height={10 * px}
                            fill="#fff"
                            stroke="#0d9488"
                            strokeWidth={1.5 * px}
                            style={{ cursor: `${h}-resize` }}
                          />
                        );
                      })}
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
            <Panel title={one ? one.name : sel.length ? `${sel.length} selected` : "New shape style"}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>Fill</span>
                  <div className="flex items-center gap-2">
                    <select className={`${inputCls} flex-1`} value={activePaint.kind} onChange={(e) => setPaint({ ...activePaint, kind: e.target.value as Paint["kind"] })}>
                      <option value="none">None</option>
                      <option value="solid">Solid</option>
                      <option value="linear">Gradient</option>
                    </select>
                    {activePaint.kind !== "none" && (
                      <input type="color" value={activePaint.color} onChange={(e) => setPaint({ ...activePaint, color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Fill color" />
                    )}
                    {activePaint.kind === "linear" && (
                      <input type="color" value={activePaint.color2} onChange={(e) => setPaint({ ...activePaint, color2: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Gradient end color" />
                    )}
                  </div>
                  {activePaint.kind === "linear" && (
                    <Slider label="Angle" value={activePaint.angle} min={0} max={360} unit="°" onChange={(v) => setPaint({ ...activePaint, angle: v })} />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>Stroke</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300">
                      <input type="checkbox" checked={strokeState.on} onChange={(e) => setStrokeProps({ on: e.target.checked })} className="accent-teal-500" />
                      On
                    </label>
                    <input type="color" value={strokeState.color} onChange={(e) => setStrokeProps({ color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Stroke color" />
                  </div>
                  <Slider label="Width" value={strokeState.width} min={0} max={60} unit="px" onChange={(v) => setStrokeProps({ width: v }, !sel.length)} />
                </div>
                {sel.length > 0 && (
                  <Slider
                    label="Opacity"
                    value={Math.round((one ? one.opacity : 1) * 100)}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => patchSelected((s) => ({ ...s, opacity: v / 100 }), false)}
                  />
                )}
                {one && (
                  <>
                    <Slider label="Rotation" value={one.rotation} min={-180} max={180} unit="°" onChange={(v) => patchSelected((s) => ({ ...s, rotation: v }), false)} />
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["x", "y", "w", "h"] as const).map((k) => {
                        const b = bbox(one);
                        return (
                          <label key={k} className="flex flex-col gap-1">
                            <span className={labelCls}>{k.toUpperCase()}</span>
                            <input
                              type="number"
                              className={`${inputCls} w-full px-1.5`}
                              value={Math.round(b[k])}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                patchSelected((s) => mapShape(s, b, { ...b, [k]: k === "w" || k === "h" ? Math.max(1, v) : v }));
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    {one.type === "rect" && (
                      <Slider label="Corner radius" value={one.rx} min={0} max={Math.round(Math.min(one.w, one.h) / 2)} unit="px" onChange={(v) => patchSelected((s) => (s.type === "rect" ? { ...s, rx: v } : s), false)} />
                    )}
                    {one.type === "polygon" && (
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Slider label="Points" value={one.sides} min={3} max={24} onChange={(v) => patchSelected((s) => (s.type === "polygon" ? { ...s, sides: v } : s), false)} />
                        </div>
                        <label className="flex items-center gap-1.5 pb-1 text-xs text-slate-300">
                          <input type="checkbox" checked={one.star} onChange={(e) => patchSelected((s) => (s.type === "polygon" ? { ...s, star: e.target.checked } : s))} className="accent-teal-500" />
                          Star
                        </label>
                      </div>
                    )}
                    {one.type === "text" && (
                      <>
                        <textarea className={inputCls} rows={2} value={one.text} onChange={(e) => patchSelected((s) => (s.type === "text" ? { ...s, text: e.target.value } : s), false)} onBlur={hist.commit} />
                        <div className="flex gap-2">
                          <select className={`${inputCls} flex-1`} value={one.font} onChange={(e) => patchSelected((s) => (s.type === "text" ? { ...s, font: e.target.value } : s))}>
                            {FONTS.map((f) => (
                              <option key={f.label} value={f.css}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          <select className={inputCls} value={one.weight} onChange={(e) => patchSelected((s) => (s.type === "text" ? { ...s, weight: Number(e.target.value) } : s))}>
                            <option value={400}>Regular</option>
                            <option value={700}>Bold</option>
                            <option value={900}>Black</option>
                          </select>
                        </div>
                        <Slider label="Size" value={Math.round(one.size)} min={6} max={400} unit="px" onChange={(v) => patchSelected((s) => (s.type === "text" ? { ...s, size: v } : s), false)} />
                      </>
                    )}
                  </>
                )}
              </div>
            </Panel>

            <Panel title="Arrange">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                  <button className={iconBtn} disabled={!sel.length} onClick={() => align("left")} title="Align left"><AlignStartVertical size={14} /></button>
                  <button className={iconBtn} disabled={!sel.length} onClick={() => align("hcenter")} title="Align horizontal centers"><AlignCenterVertical size={14} /></button>
                  <button className={iconBtn} disabled={!sel.length} onClick={() => align("right")} title="Align right"><AlignEndVertical size={14} /></button>
                  <button className={iconBtn} disabled={!sel.length} onClick={() => align("top")} title="Align top"><AlignStartHorizontal size={14} /></button>
                  <button className={iconBtn} disabled={!sel.length} onClick={() => align("vcenter")} title="Align vertical centers"><AlignCenterHorizontal size={14} /></button>
                  <button className={iconBtn} disabled={!sel.length} onClick={() => align("bottom")} title="Align bottom"><AlignEndHorizontal size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button className={btn} disabled={sel.length < 3} onClick={() => distribute("x")}>Distribute H</button>
                  <button className={btn} disabled={sel.length < 3} onClick={() => distribute("y")}>Distribute V</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button className={iconBtn} disabled={!sel.length} onClick={() => arrange("front")} title="Bring to front"><BringToFront size={14} /></button>
                  <button className={btn} disabled={!sel.length} onClick={() => arrange("forward")}>Forward</button>
                  <button className={btn} disabled={!sel.length} onClick={() => arrange("backward")}>Backward</button>
                  <button className={iconBtn} disabled={!sel.length} onClick={() => arrange("back")} title="Send to back"><SendToBack size={14} /></button>
                </div>
                <span className={`${labelCls} mt-1`}>Pathfinder</span>
                <div className="grid grid-cols-2 gap-1">
                  {(["unite", "subtract", "intersect", "exclude"] as const).map((op) => (
                    <button key={op} className={btn} disabled={sel.length < 2} onClick={() => booleanOp(op)}>
                      {op[0].toUpperCase() + op.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button className={btn} disabled={!sel.length} onClick={duplicate}><Copy size={14} /> Duplicate</button>
                  <button className={btn} disabled={!sel.length} onClick={deleteSelected}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </Panel>

            <Panel
              title="Layers"
              right={
                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  Background
                  <input
                    type="color"
                    value={doc.background === "transparent" ? "#ffffff" : doc.background}
                    onChange={(e) => hist.set((d) => ({ ...d, background: e.target.value }))}
                    className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
                  />
                  <button
                    className="text-[11px] underline"
                    onClick={() => hist.set((d) => ({ ...d, background: d.background === "transparent" ? "#ffffff" : "transparent" }))}
                  >
                    {doc.background === "transparent" ? "fill" : "clear"}
                  </button>
                </label>
              }
            >
              {doc.shapes.length ? (
                <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                  {[...doc.shapes].reverse().map((s) => (
                    <li key={s.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selected.includes(s.id) ? "bg-accent/20 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                      <button onClick={() => setShapes((shapes) => shapes.map((x) => (x.id === s.id ? { ...x, hidden: !x.hidden } : x)))} className="text-slate-400 hover:text-white" aria-label={s.hidden ? "Show" : "Hide"}>
                        {s.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button className="min-w-0 flex-1 truncate text-left" onClick={(e) => setSelected((cur) => (e.shiftKey ? [...cur, s.id] : [s.id]))}>
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <FilePlus size={14} /> Empty artboard. Pick a tool and draw.
                </p>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
