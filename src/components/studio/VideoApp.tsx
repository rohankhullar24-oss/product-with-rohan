"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  Bookmark,
  Download,
  Film,
  FolderOpen,
  Music,
  Pause,
  Play,
  Redo2,
  Scissors,
  SkipBack,
  SkipForward,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
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
  recordCanvas,
  uid,
  useHistory,
  useKeys,
} from "./shared";

// A multi-track editor. Media plays through hidden <video>/<audio> elements
// (one per clip, so a source can appear twice at once) and every frame is
// composited onto a canvas, which is also what export records.

type TrackId = "t1" | "v2" | "v1" | "a1";
type MediaKind = "video" | "audio" | "image";

type Media = { id: string; name: string; kind: MediaKind; url: string; duration: number };

type Clip = {
  id: string;
  track: TrackId;
  mediaId?: string;
  start: number;
  in: number;
  out: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  scale: number;
  x: number;
  y: number;
  text?: string;
  color?: string;
  size?: number;
  pos?: "top" | "center" | "bottom";
  bg?: boolean;
};

type Project = { clips: Clip[]; markers: number[]; aspect: "16:9" | "9:16" | "1:1" };

type Drag = { kind: "move" | "trimL" | "trimR"; id: string; x0: number; orig: Clip } | { kind: "scrub" };

const TRACKS: { id: TrackId; label: string; kinds: (MediaKind | "title")[] }[] = [
  { id: "t1", label: "Titles", kinds: ["title"] },
  { id: "v2", label: "Overlay", kinds: ["video", "image"] },
  { id: "v1", label: "Video", kinds: ["video", "image"] },
  { id: "a1", label: "Audio", kinds: ["audio"] },
];

const SIZES = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [1080, 1080] } as const;
const FPS = 30;
const SNAP_PX = 8;

const dur = (c: Clip) => c.out - c.in;
const end = (c: Clip) => c.start + dur(c);

function probe(file: File): Promise<Media> {
  const url = URL.createObjectURL(file);
  const kind: MediaKind = file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "image" : "video";
  const base = { id: uid("m"), name: file.name, kind, url };
  if (kind === "image") return Promise.resolve({ ...base, duration: 5 });
  return new Promise((resolve, reject) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration)) return resolve({ ...base, duration: el.duration });
      // WebM from MediaRecorder (including this app's own exports) has no
      // duration header; seeking far past the end makes the browser scan for it.
      el.ondurationchange = () => {
        if (!Number.isFinite(el.duration)) return;
        el.ondurationchange = null;
        el.currentTime = 0;
        resolve({ ...base, duration: el.duration });
      };
      el.currentTime = 1e9;
    };
    el.onerror = () => reject(new Error(`Can't play ${file.name}`));
    el.src = url;
  });
}

function fadeFactor(c: Clip, t: number) {
  const local = t - c.start;
  let f = 1;
  if (c.fadeIn > 0) f = Math.min(f, local / c.fadeIn);
  if (c.fadeOut > 0) f = Math.min(f, (dur(c) - local) / c.fadeOut);
  return clamp(f, 0, 1);
}

function trackKind(m: Media | undefined, c: Clip): MediaKind | "title" {
  return c.track === "t1" ? "title" : (m?.kind ?? "image");
}

export default function VideoApp() {
  const hist = useHistory<Project>(() => ({ clips: [], markers: [], aspect: "16:9" }));
  const project = hist.state;
  const [media, setMedia] = useState<Media[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pps, setPps] = useState(40);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const elsRef = useRef(new Map<string, HTMLMediaElement>());
  const imgsRef = useRef(new Map<string, HTMLImageElement>());
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode; rec: MediaStreamAudioDestinationNode; routed: WeakSet<HTMLMediaElement> } | null>(null);
  const clockRef = useRef<{ wall: number; t: number } | null>(null);
  const tRef = useRef(0);
  const live = useRef({ project, media });
  const drawRef = useRef<() => void>(() => {});
  const onEndRef = useRef<(() => void) | null>(null);

  const [W, H] = SIZES[project.aspect];
  const total = Math.max(5, ...project.clips.map(end));
  const sel = project.clips.find((c) => c.id === selected) ?? null;
  const selMedia = sel?.mediaId ? media.find((m) => m.id === sel.mediaId) : undefined;

  // ---------- media plumbing ----------

  function ensureAudio() {
    if (!audioRef.current) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      const rec = ctx.createMediaStreamDestination();
      master.connect(ctx.destination);
      master.connect(rec);
      audioRef.current = { ctx, master, rec, routed: new WeakSet() };
      elsRef.current.forEach(route);
    }
    if (audioRef.current.ctx.state === "suspended") audioRef.current.ctx.resume();
    return audioRef.current;
  }

  function route(el: HTMLMediaElement) {
    const a = audioRef.current;
    if (!a || a.routed.has(el)) return;
    a.ctx.createMediaElementSource(el).connect(a.master);
    a.routed.add(el);
  }

  function elFor(c: Clip, m: Media): HTMLMediaElement {
    let el = elsRef.current.get(c.id);
    if (!el || el.dataset.src !== m.url) {
      el?.pause();
      el = document.createElement(m.kind === "audio" ? "audio" : "video");
      el.dataset.src = m.url;
      el.preload = "auto";
      (el as HTMLVideoElement).playsInline = true;
      el.src = m.url;
      el.addEventListener("seeked", () => drawRef.current());
      el.addEventListener("loadeddata", () => drawRef.current());
      elsRef.current.set(c.id, el);
      route(el);
    }
    return el;
  }

  function imgFor(m: Media) {
    let img = imgsRef.current.get(m.id);
    if (!img) {
      img = new Image();
      img.onload = () => drawRef.current();
      img.src = m.url;
      imgsRef.current.set(m.id, img);
    }
    return img;
  }

  function syncMedia(t: number, isPlaying: boolean) {
    const { project: p, media: ms } = live.current;
    const activeIds = new Set<string>();
    for (const c of p.clips) {
      const m = c.mediaId ? ms.find((x) => x.id === c.mediaId) : undefined;
      if (!m || m.kind === "image") continue;
      const el = elFor(c, m);
      const active = t >= c.start && t < end(c);
      if (!active) {
        if (!el.paused) el.pause();
        continue;
      }
      activeIds.add(c.id);
      const target = c.in + (t - c.start);
      el.volume = clamp(c.volume * fadeFactor(c, t), 0, 1);
      if (isPlaying) {
        if (el.paused) {
          el.currentTime = target;
          el.play().catch(() => {});
        } else if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target;
      } else {
        if (!el.paused) el.pause();
        if (Math.abs(el.currentTime - target) > 0.01) el.currentTime = target;
      }
    }
    elsRef.current.forEach((el, id) => {
      if (!activeIds.has(id) && !el.paused) el.pause();
    });
  }

  function draw(t = tRef.current) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const { project: p, media: ms } = live.current;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (const track of ["v1", "v2", "t1"] as TrackId[]) {
      const c = p.clips.find((x) => x.track === track && t >= x.start && t < end(x));
      if (!c) continue;
      ctx.save();
      ctx.globalAlpha = fadeFactor(c, t);
      if (track === "t1") {
        const size = (c.size ?? 64) * (cv.width / 1280);
        ctx.font = `700 ${size}px system-ui, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = (c.text ?? "").split("\n");
        const lh = size * 1.2;
        const blockH = lh * lines.length;
        const cy = c.pos === "top" ? cv.height * 0.15 + blockH / 2 : c.pos === "center" ? cv.height / 2 : cv.height * 0.85 - blockH / 2;
        if (c.bg) {
          const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(cv.width / 2 - w / 2, cy - blockH / 2 - size * 0.25, w, blockH + size * 0.5);
        }
        ctx.fillStyle = c.color ?? "#ffffff";
        lines.forEach((l, i) => ctx.fillText(l, cv.width / 2, cy - blockH / 2 + lh * (i + 0.5)));
      } else {
        const m = ms.find((x) => x.id === c.mediaId);
        let src: CanvasImageSource | null = null;
        let sw = 0;
        let sh = 0;
        if (m?.kind === "image") {
          const img = imgFor(m);
          if (img.complete && img.naturalWidth) [src, sw, sh] = [img, img.naturalWidth, img.naturalHeight];
        } else if (m) {
          const v = elsRef.current.get(c.id) as HTMLVideoElement | undefined;
          if (v && v.readyState >= 2 && v.videoWidth) [src, sw, sh] = [v, v.videoWidth, v.videoHeight];
        }
        if (src) {
          const fit = Math.min(cv.width / sw, cv.height / sh) * c.scale;
          const w = sw * fit;
          const h = sh * fit;
          const x = (cv.width - w) / 2 + c.x * cv.width;
          const y = (cv.height - h) / 2 + c.y * cv.height;
          ctx.drawImage(src, x, y, w, h);
        }
      }
      ctx.restore();
    }
  }

  useEffect(() => {
    live.current = { project, media };
    drawRef.current = () => draw();
    if (!clockRef.current) {
      syncMedia(tRef.current, false);
      draw();
    }
  });

  // ---------- transport ----------

  function seek(t: number) {
    const v = clamp(t, 0, total);
    tRef.current = v;
    setPlayhead(v);
    if (clockRef.current) {
      clockRef.current = { wall: performance.now(), t: v };
      syncMedia(v, true);
    }
  }

  function play(fromStart = false) {
    ensureAudio();
    if (fromStart) seek(0);
    if (tRef.current >= total - 0.01) seek(0);
    clockRef.current = { wall: performance.now(), t: tRef.current };
    setPlaying(true);
    const tick = () => {
      const clock = clockRef.current;
      if (!clock) return;
      const t = clock.t + (performance.now() - clock.wall) / 1000;
      const limit = Math.max(5, ...live.current.project.clips.map(end));
      if (t >= limit) {
        tRef.current = limit;
        setPlayhead(limit);
        pause();
        onEndRef.current?.();
        return;
      }
      tRef.current = t;
      setPlayhead(t);
      syncMedia(t, true);
      draw(t);
      requestAnimationFrame(tick);
    };
    syncMedia(tRef.current, true);
    requestAnimationFrame(tick);
  }

  function pause() {
    clockRef.current = null;
    setPlaying(false);
    syncMedia(tRef.current, false);
  }

  // ---------- editing ----------

  async function importFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    ensureAudio();
    const added: Media[] = [];
    for (const f of files) {
      try {
        added.push(await probe(f));
      } catch (err) {
        setError((err as Error).message);
      }
    }
    if (!added.length) return;
    setMedia((m) => [...m, ...added]);
    // Drop the first imports straight onto an empty timeline.
    if (!project.clips.length) added.forEach((m) => addToTimeline(m));
  }

  function addToTimeline(m: Media) {
    hist.set((p) => {
      const track: TrackId = m.kind === "audio" ? "a1" : "v1";
      const start = Math.max(0, ...p.clips.filter((c) => c.track === track).map(end));
      const clip: Clip = { id: uid("c"), track, mediaId: m.id, start, in: 0, out: m.duration, volume: 1, fadeIn: 0, fadeOut: 0, scale: 1, x: 0, y: 0 };
      return { ...p, clips: [...p.clips, clip] };
    });
  }

  function addTitle() {
    const clip: Clip = {
      id: uid("c"),
      track: "t1",
      start: tRef.current,
      in: 0,
      out: 3,
      volume: 1,
      fadeIn: 0.3,
      fadeOut: 0.3,
      scale: 1,
      x: 0,
      y: 0,
      text: "Your title",
      color: "#ffffff",
      size: 72,
      pos: "bottom",
      bg: true,
    };
    hist.set((p) => ({ ...p, clips: [...p.clips, clip] }));
    setSelected(clip.id);
  }

  function patchClip(id: string, patch: Partial<Clip>, commit = true) {
    hist.set((p) => ({ ...p, clips: p.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), commit);
  }

  function split() {
    const t = tRef.current;
    const targets = project.clips.filter((c) => (selected ? c.id === selected : true) && t > c.start + 0.05 && t < end(c) - 0.05);
    if (!targets.length) return;
    hist.set((p) => ({
      ...p,
      clips: p.clips.flatMap((c) => {
        if (!targets.some((x) => x.id === c.id)) return [c];
        const cut = c.in + (t - c.start);
        return [
          { ...c, out: cut, fadeOut: 0 },
          { ...c, id: uid("c"), start: t, in: cut, fadeIn: 0 },
        ];
      }),
    }));
  }

  function remove(ripple: boolean) {
    if (!sel) return;
    hist.set((p) => ({
      ...p,
      clips: p.clips
        .filter((c) => c.id !== sel.id)
        .map((c) => (ripple && c.track === sel.track && c.start >= end(sel) - 0.001 ? { ...c, start: c.start - dur(sel) } : c)),
    }));
    setSelected(null);
  }

  function toggleMarker() {
    const t = Math.round(tRef.current * FPS) / FPS;
    hist.set((p) => {
      const near = p.markers.find((m) => Math.abs(m - t) < 0.1);
      return { ...p, markers: near !== undefined ? p.markers.filter((m) => m !== near) : [...p.markers, t].sort((a, b) => a - b) };
    });
  }

  function snap(t: number, ignoreId: string) {
    const points = [0, tRef.current, ...project.markers];
    project.clips.forEach((c) => c.id !== ignoreId && points.push(c.start, end(c)));
    let best = t;
    let bestD = SNAP_PX / pps;
    for (const p of points) {
      if (Math.abs(p - t) < bestD) {
        best = p;
        bestD = Math.abs(p - t);
      }
    }
    return best;
  }

  // ---------- timeline pointer ----------

  function onClipDown(e: ReactPointerEvent<HTMLDivElement>, c: Clip, kind: "move" | "trimL" | "trimR") {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(c.id);
    setDrag({ kind, id: c.id, x0: e.clientX, orig: c });
  }

  function onClipMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || drag.kind === "scrub") return;
    const o = drag.orig;
    const dt = (e.clientX - drag.x0) / pps;
    const m = o.mediaId ? media.find((x) => x.id === o.mediaId) : undefined;
    const bounded = m && m.kind !== "image";
    if (drag.kind === "move") {
      let start = Math.max(0, o.start + dt);
      const snappedStart = snap(start, o.id);
      const snappedEnd = snap(start + dur(o), o.id);
      if (snappedStart !== start) start = snappedStart;
      else if (snappedEnd !== start + dur(o)) start = snappedEnd - dur(o);
      // Vertical drag moves between compatible tracks.
      const row = (e.target as HTMLElement).ownerDocument
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => el instanceof HTMLElement && el.dataset.track) as HTMLElement | undefined;
      const kind = trackKind(m, o);
      const track = row && TRACKS.find((t) => t.id === row.dataset.track)?.kinds.includes(kind) ? (row.dataset.track as TrackId) : o.track;
      patchClip(o.id, { start: Math.max(0, start), track }, false);
    } else if (drag.kind === "trimL") {
      let start = snap(o.start + dt, o.id);
      let delta = start - o.start;
      delta = clamp(delta, bounded ? -o.in : -o.start, dur(o) - 0.1);
      start = o.start + delta;
      patchClip(o.id, bounded ? { start, in: o.in + delta } : { start, out: o.out - delta }, false);
    } else {
      const newEnd = snap(end(o) + dt, o.id);
      let out = o.out + (newEnd - end(o));
      out = Math.max(o.in + 0.1, bounded ? Math.min(out, m!.duration) : out);
      patchClip(o.id, { out }, false);
    }
  }

  function onClipUp() {
    if (drag) hist.commit();
    setDrag(null);
  }

  function rulerSeek(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - rect.left + e.currentTarget.scrollLeft) / pps);
  }

  // ---------- export ----------

  async function exportVideo() {
    if (!project.clips.length || !canvasRef.current) return;
    pause();
    const a = ensureAudio();
    setExporting(0);
    try {
      const blob = await recordCanvas(
        canvasRef.current,
        () =>
          new Promise<void>((resolve) => {
            onEndRef.current = () => {
              onEndRef.current = null;
              resolve();
            };
            seek(0);
            play();
          }),
        a.rec.stream,
        FPS,
      );
      downloadBlob(blob, "edit.webm");
    } catch {
      setError("Export failed. Your browser may not support MediaRecorder.");
    } finally {
      setExporting(null);
    }
  }

  // ---------- keyboard ----------

  useKeys((e) => {
    if (exporting !== null) return;
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    if (e.metaKey || e.ctrlKey) return;
    const k = e.key.toLowerCase();
    if (e.key === " ") {
      e.preventDefault();
      if (playing) pause();
      else play();
    } else if (k === "l") play();
    else if (k === "k") pause();
    else if (k === "j") seek(tRef.current - 5);
    else if (k === "s") split();
    else if (k === "m") toggleMarker();
    else if (k === "t") addTitle();
    else if (e.key === "ArrowLeft") seek(tRef.current - (e.shiftKey ? 1 : 1 / FPS));
    else if (e.key === "ArrowRight") seek(tRef.current + (e.shiftKey ? 1 : 1 / FPS));
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(total);
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(e.shiftKey);
    }
  });

  useEffect(() => {
    const els = elsRef.current;
    return () => {
      clockRef.current = null;
      els.forEach((el) => el.pause());
      audioRef.current?.ctx.close();
    };
  }, []);

  // ---------- UI ----------

  const laneW = Math.max(total + 10, 30) * pps;
  const tickStep = pps >= 60 ? 1 : pps >= 20 ? 5 : 10;
  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={fileRef} type="file" accept="video/*,audio/*,image/*" multiple className="hidden" onChange={importFiles} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Video" replaces="Premiere Pro" blurb="Cut video, overlays, titles and music on a multi-track timeline. Renders to WebM in your browser.">
          <button className={btn} onClick={() => fileRef.current?.click()}>
            <FolderOpen size={14} /> Import media
          </button>
          <button className={btn} onClick={addTitle}>
            <Type size={14} /> Title
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo">
            <Undo2 size={14} />
          </button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo">
            <Redo2 size={14} />
          </button>
          <button className={btnPrimary} disabled={!project.clips.length || exporting !== null} onClick={exportVideo}>
            <Download size={14} /> {exporting !== null ? `Rendering ${formatTime(playhead)} / ${formatTime(total)}` : "Export WebM"}
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
          <Panel title="Media">
            {media.length ? (
              <ul className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
                {media.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
                    {m.kind === "video" ? <Film size={14} /> : m.kind === "audio" ? <Music size={14} /> : <ImageIcon size={14} />}
                    <span className="min-w-0 flex-1 truncate" title={m.name}>
                      {m.name}
                    </span>
                    <button className="text-xs text-accent hover:underline" onClick={() => addToTimeline(m)}>
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400 hover:border-accent hover:text-white">
                Import video, audio or images
              </button>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Space play · J/K/L · S split · M marker · T title · Del delete · Shift+Del ripple delete · ←/→ frame step
            </p>
          </Panel>

          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-center bg-black" style={{ height: "min(46vh, 520px)" }}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="max-h-full max-w-full"
                style={{ aspectRatio: `${W} / ${H}` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className={iconBtn} onClick={() => seek(0)} title="Start (Home)">
                <SkipBack size={14} />
              </button>
              <button className={btnPrimary} onClick={() => (playing ? pause() : play())} disabled={exporting !== null}>
                {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Play"}
              </button>
              <button className={iconBtn} onClick={() => seek(total)} title="End (End)">
                <SkipForward size={14} />
              </button>
              <span className="font-mono text-xs tabular-nums text-slate-300">
                {formatTime(playhead)} / {formatTime(total)}
              </span>
              <select
                className={`${inputCls} ml-auto py-1 text-xs`}
                value={project.aspect}
                onChange={(e) => hist.set((p) => ({ ...p, aspect: e.target.value as Project["aspect"] }))}
                aria-label="Aspect ratio"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </div>
          </div>

          <Panel title={sel ? (sel.track === "t1" ? "Title" : selMedia?.name ?? "Clip") : "Clip"}>
            {sel ? (
              <div className="flex flex-col gap-3" onPointerUp={hist.commit} onKeyUp={hist.commit}>
                <p className="font-mono text-[11px] text-slate-400">
                  {formatTime(sel.start)} → {formatTime(end(sel))} ({dur(sel).toFixed(2)}s)
                </p>
                {sel.track === "t1" && (
                  <>
                    <textarea className={inputCls} rows={2} value={sel.text} onChange={(e) => patchClip(sel.id, { text: e.target.value }, false)} />
                    <div className="flex items-center gap-2">
                      <input type="color" value={sel.color} onChange={(e) => patchClip(sel.id, { color: e.target.value }, false)} className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" aria-label="Title color" />
                      <select className={`${inputCls} flex-1`} value={sel.pos} onChange={(e) => patchClip(sel.id, { pos: e.target.value as Clip["pos"] })}>
                        <option value="top">Top</option>
                        <option value="center">Center</option>
                        <option value="bottom">Lower third</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-300">
                        <input type="checkbox" checked={!!sel.bg} onChange={(e) => patchClip(sel.id, { bg: e.target.checked })} className="accent-teal-500" /> Box
                      </label>
                    </div>
                    <Slider label="Size" value={sel.size ?? 64} min={16} max={200} unit="px" onChange={(v) => patchClip(sel.id, { size: v }, false)} />
                    <Slider label="Duration" value={dur(sel)} min={0.5} max={30} step={0.1} unit="s" onChange={(v) => patchClip(sel.id, { out: sel.in + v }, false)} />
                  </>
                )}
                {selMedia?.kind === "image" && (
                  <Slider label="Duration" value={dur(sel)} min={0.5} max={60} step={0.1} unit="s" onChange={(v) => patchClip(sel.id, { out: sel.in + v }, false)} />
                )}
                {selMedia && selMedia.kind !== "image" && (
                  <Slider label="Volume" value={Math.round(sel.volume * 100)} min={0} max={100} unit="%" onChange={(v) => patchClip(sel.id, { volume: v / 100 }, false)} />
                )}
                <Slider label="Fade in" value={sel.fadeIn} min={0} max={Math.min(5, dur(sel))} step={0.1} unit="s" onChange={(v) => patchClip(sel.id, { fadeIn: v }, false)} />
                <Slider label="Fade out" value={sel.fadeOut} min={0} max={Math.min(5, dur(sel))} step={0.1} unit="s" onChange={(v) => patchClip(sel.id, { fadeOut: v }, false)} />
                {(sel.track === "v1" || sel.track === "v2") && (
                  <>
                    <Slider label="Scale" value={Math.round(sel.scale * 100)} min={10} max={300} unit="%" onChange={(v) => patchClip(sel.id, { scale: v / 100 }, false)} />
                    <Slider label="Position X" value={Math.round(sel.x * 100)} min={-50} max={50} unit="%" onChange={(v) => patchClip(sel.id, { x: v / 100 }, false)} />
                    <Slider label="Position Y" value={Math.round(sel.y * 100)} min={-50} max={50} unit="%" onChange={(v) => patchClip(sel.id, { y: v / 100 }, false)} />
                    <button className={btn} onClick={() => patchClip(sel.id, { scale: 0.35, x: 0.3, y: 0.28 })}>
                      Picture-in-picture
                    </button>
                  </>
                )}
                <div className="flex gap-1">
                  <button className={btn} onClick={split}>
                    <Scissors size={14} /> Split
                  </button>
                  <button className={btn} onClick={() => remove(false)}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className={btn} onClick={() => remove(true)} title="Delete and close the gap">
                    Ripple
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select a clip on the timeline to edit it.</p>
            )}
          </Panel>
        </div>

        {/* Timeline */}
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 select-none">
          <div className="flex items-center gap-1.5 border-b border-slate-800 px-2 py-1.5">
            <button className={iconBtn} onClick={split} title="Split at playhead (S)">
              <Scissors size={14} />
            </button>
            <button className={iconBtn} onClick={toggleMarker} title="Add/remove marker (M)">
              <Bookmark size={14} />
            </button>
            <span className="mx-1 h-5 w-px bg-slate-700" />
            <button className={iconBtn} onClick={() => setPps((v) => clamp(v / 1.4, 4, 300))} title="Zoom out timeline">
              <ZoomOut size={14} />
            </button>
            <button className={iconBtn} onClick={() => setPps((v) => clamp(v * 1.4, 4, 300))} title="Zoom in timeline">
              <ZoomIn size={14} />
            </button>
            <span className={`${labelCls} ml-auto`}>{project.clips.length} clips</span>
          </div>
          <div className="flex">
            <div className="w-20 shrink-0 border-r border-slate-800">
              <div className="h-6 border-b border-slate-800" />
              {TRACKS.map((t) => (
                <div key={t.id} className="flex h-12 items-center border-b border-slate-800 px-2 text-[11px] font-medium text-slate-400">
                  {t.label}
                </div>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 overflow-x-auto">
              <div className="relative" style={{ width: laneW }}>
                <div
                  className="relative h-6 cursor-pointer border-b border-slate-800 bg-slate-950"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDrag({ kind: "scrub" });
                    rulerSeek(e);
                  }}
                  onPointerMove={(e) => drag?.kind === "scrub" && rulerSeek(e)}
                  onPointerUp={() => setDrag(null)}
                >
                  {Array.from({ length: Math.ceil(laneW / pps / tickStep) + 1 }, (_, i) => i * tickStep).map((s) => (
                    <span key={s} className="absolute top-0 h-full border-l border-slate-700 pl-1 font-mono text-[9px] text-slate-500" style={{ left: s * pps }}>
                      {formatTime(s).replace(/\.\d+$/, "")}
                    </span>
                  ))}
                  {project.markers.map((m) => (
                    <span key={m} className="absolute top-0 h-3 w-2 -translate-x-1 bg-amber-400" style={{ left: m * pps, clipPath: "polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)" }} title={formatTime(m)} />
                  ))}
                </div>
                {TRACKS.map((t) => (
                  <div key={t.id} data-track={t.id} className="relative h-12 border-b border-slate-800" onPointerDown={() => setSelected(null)}>
                    {project.clips
                      .filter((c) => c.track === t.id)
                      .map((c) => {
                        const m = c.mediaId ? media.find((x) => x.id === c.mediaId) : undefined;
                        const color = t.id === "t1" ? "bg-violet-600/80" : t.id === "a1" ? "bg-emerald-600/80" : m?.kind === "image" ? "bg-sky-700/80" : "bg-teal-700/80";
                        return (
                          <div
                            key={c.id}
                            onPointerDown={(e) => onClipDown(e, c, "move")}
                            onPointerMove={onClipMove}
                            onPointerUp={onClipUp}
                            className={`absolute top-1 bottom-1 cursor-grab overflow-hidden rounded-md text-[11px] text-white ${color} ${selected === c.id ? "ring-2 ring-white" : ""}`}
                            style={{ left: c.start * pps, width: Math.max(4, dur(c) * pps) }}
                          >
                            {c.fadeIn > 0 && <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-black/50 to-transparent" style={{ width: c.fadeIn * pps }} />}
                            {c.fadeOut > 0 && <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-black/50 to-transparent" style={{ width: c.fadeOut * pps }} />}
                            <span className="pointer-events-none relative block truncate px-2 py-1">{t.id === "t1" ? c.text : m?.name}</span>
                            <div onPointerDown={(e) => onClipDown(e, c, "trimL")} onPointerMove={onClipMove} onPointerUp={onClipUp} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/40" />
                            <div onPointerDown={(e) => onClipDown(e, c, "trimR")} onPointerMove={onClipMove} onPointerUp={onClipUp} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/40" />
                          </div>
                        );
                      })}
                  </div>
                ))}
                <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-500" style={{ left: playhead * pps }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
