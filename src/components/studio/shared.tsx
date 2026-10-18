"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Shared styling and plumbing for the Open Studio apps.

export const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40";
export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40";
export const labelCls = "flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500";
export const inputCls =
  "rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white disabled:opacity-40";
export const panelCls = "rounded-xl border border-slate-800 bg-slate-900 p-4";

export function toolBtnCls(on: boolean) {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
    on ? "bg-accent text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`;
}

export function AppHeader({ name, replaces, blurb, children }: {
  name: string;
  replaces: string;
  blurb: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Open Studio · replaces {replaces}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{blurb}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className={panelCls}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Slider({ label, value, min, max, step = 1, unit = "", disabled, onChange, onReset }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
  onReset?: () => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelCls}>
        {label}
        <span className="tabular-nums text-slate-300">
          {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={onReset}
        className="accent-teal-500 disabled:opacity-40"
      />
    </label>
  );
}

export function ErrorBanner({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-200">
      {message}
      <button onClick={onClose} className="text-red-300 hover:text-white" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function isTypingTarget(t: EventTarget | null) {
  return (
    t instanceof HTMLElement &&
    (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)
  );
}

/** Window keydown listener that ignores keys typed into form fields. */
export function useKeys(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTypingTarget(e.target)) ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

type Hist<T> = { past: T[]; committed: T; present: T; future: T[] };

const HISTORY_LIMIT = 80;

/**
 * Undoable state. `set(next, false)` updates the live value without creating
 * an undo step (use it while dragging), then `commit()` records one step.
 * State must be treated as immutable.
 */
export function useHistory<T>(init: () => T) {
  const [h, setH] = useState<Hist<T>>(() => {
    const v = init();
    return { past: [], committed: v, present: v, future: [] };
  });

  const set = useCallback((next: T | ((prev: T) => T), commit = true) => {
    setH((s) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(s.present) : next;
      if (!commit) return { ...s, present: v };
      return { past: [...s.past, s.committed].slice(-HISTORY_LIMIT), committed: v, present: v, future: [] };
    });
  }, []);

  const commit = useCallback(() => {
    setH((s) =>
      s.present === s.committed
        ? s
        : { past: [...s.past, s.committed].slice(-HISTORY_LIMIT), committed: s.present, present: s.present, future: [] },
    );
  }, []);

  const undo = useCallback(() => {
    setH((s) => {
      if (s.present !== s.committed) return { ...s, present: s.committed };
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), committed: prev, present: prev, future: [s.committed, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setH((s) => {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return { past: [...s.past, s.committed], committed: next, present: next, future: rest };
    });
  }, []);

  const reset = useCallback((v: T) => setH({ past: [], committed: v, present: v, future: [] }), []);

  return {
    state: h.present,
    set,
    commit,
    undo,
    redo,
    reset,
    canUndo: h.past.length > 0 || h.present !== h.committed,
    canRedo: h.future.length > 0,
  };
}

/** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y. Returns true if handled. */
export function handleUndoKeys(e: KeyboardEvent, undo: () => void, redo: () => void) {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return false;
  const k = e.key.toLowerCase();
  if (k === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return true;
  }
  if (k === "y") {
    e.preventDefault();
    redo();
    return true;
  }
  return false;
}

export function formatTime(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
}

/**
 * Records a canvas (plus an optional audio stream) to WebM in real time.
 * `run` drives playback and resolves when it's done.
 */
export async function recordCanvas(
  canvas: HTMLCanvasElement,
  run: () => Promise<void>,
  audio?: MediaStream,
  fps = 30,
): Promise<Blob> {
  const stream = canvas.captureStream(fps);
  audio?.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start(250);
  try {
    await run();
  } finally {
    rec.stop();
    await stopped;
    stream.getVideoTracks().forEach((t) => t.stop());
  }
  return new Blob(chunks, { type: "video/webm" });
}
