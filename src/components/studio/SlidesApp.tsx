"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Copy, Download, FilePlus, FolderOpen, Minimize2, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { AppHeader, ErrorBanner, btn, btnPrimary, downloadBlob, handleUndoKeys, inputCls, labelCls, useHistory, useKeys } from "./shared";
import { readPptx, writePptx } from "@/lib/office/pptx";
import type { Slide } from "@/lib/office/pptx";
import { compressOoxml, formatBytes } from "@/lib/office/compress";
import { takeHandOff } from "@/lib/office/handoff";

// Slide titles and body text, like reminder-app's PptxEditorActivity, with a
// live 16:9 preview and a few theme presets for the saved deck.

const THEMES = [
  { name: "Light", background: "#ffffff", accent: "#0f766e", text: "#1e293b" },
  { name: "Dark", background: "#0f172a", accent: "#2dd4bf", text: "#e2e8f0" },
  { name: "Warm", background: "#fff7ed", accent: "#c2410c", text: "#431407" },
  { name: "Ocean", background: "#eff6ff", accent: "#1d4ed8", text: "#1e293b" },
];

function SlideView({ s, small, theme }: { s: Slide; small?: boolean; theme: (typeof THEMES)[number] }) {
  const scale = small ? 0.22 : 1;
  return (
    <div className="relative w-full overflow-hidden rounded-md shadow-lg" style={{ aspectRatio: "16 / 9", background: theme.background }}>
      <div className="absolute inset-0 origin-top-left" style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})`, padding: "5% 6%" }}>
        <div className="text-[clamp(18px,3.2vw,40px)] font-bold leading-tight" style={{ color: theme.accent, fontSize: small ? 40 : undefined }}>
          {s.title || <span className="opacity-30">Slide title</span>}
        </div>
        <ul className="mt-[4%] list-disc space-y-1 pl-[4%]" style={{ color: theme.text, fontSize: small ? 26 : "clamp(12px,1.9vw,24px)" }}>
          {s.body.split("\n").filter((l) => l.trim()).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function SlidesApp() {
  const hist = useHistory<Slide[]>(() => [{ title: "Your title", body: "First point\nSecond point" }]);
  const slides = hist.state;
  const [idx, setIdx] = useState(0);
  const [theme, setTheme] = useState(THEMES[0]);
  const [fileName, setFileName] = useState("presentation");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openRef = useRef<HTMLInputElement>(null);
  const compressRef = useRef<HTMLInputElement>(null);
  const cur = slides[Math.min(idx, slides.length - 1)];

  useEffect(() => {
    const f = takeHandOff("slides");
    if (f) void openFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openFile(f: File) {
    setError(null);
    setBusy("Opening…");
    try {
      hist.reset(await readPptx(await f.arrayBuffer()));
      setIdx(0);
      setFileName(f.name.replace(/\.[^.]+$/, ""));
      setNotice("Opened: titles and body text only. Saving creates a clean deck with your chosen theme; images and transitions aren't kept.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that file.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("Saving…");
    try {
      downloadBlob(await writePptx(slides, theme), `${fileName}.pptx`);
      setNotice("Saved.");
    } catch {
      setError("Couldn't save the presentation.");
    } finally {
      setBusy(null);
    }
  }

  async function compressFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy("Compressing…");
    try {
      const r = await compressOoxml(f);
      if (r.after >= r.before) setNotice(`${f.name} is already as small as it gets (${formatBytes(r.before)}).`);
      else {
        downloadBlob(r.blob, f.name.replace(/(\.[^.]+)$/, "-compressed$1"));
        setNotice(`Compressed ${f.name}: ${formatBytes(r.before)} → ${formatBytes(r.after)}${r.images ? `, ${r.images} image(s) re-encoded` : ""}.`);
      }
    } catch {
      setError("That doesn't look like a Word, PowerPoint or Excel file.");
    } finally {
      setBusy(null);
    }
  }

  const patch = (p: Partial<Slide>, commit = false) => hist.set((s) => s.map((x, i) => (i === idx ? { ...x, ...p } : x)), commit);
  const add = (copy = false) => {
    hist.set((s) => [...s.slice(0, idx + 1), copy ? { ...cur } : { title: "", body: "" }, ...s.slice(idx + 1)]);
    setIdx(idx + 1);
  };
  const remove = () => {
    if (slides.length === 1) return hist.set([{ title: "", body: "" }]);
    hist.set((s) => s.filter((_, i) => i !== idx));
    setIdx(Math.max(0, idx - 1));
  };
  const move = (dir: 1 | -1) => {
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    hist.set((s) => {
      const out = [...s];
      [out[idx], out[j]] = [out[j], out[idx]];
      return out;
    });
    setIdx(j);
  };

  useKeys((e) => {
    if (handleUndoKeys(e, hist.undo, hist.redo)) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") setIdx((i) => Math.min(slides.length - 1, i + 1));
    if (e.key === "ArrowUp" || e.key === "PageUp") setIdx((i) => Math.max(0, i - 1));
  });

  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={openRef} type="file" accept=".pptx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void openFile(f); }} />
      <input ref={compressRef} type="file" accept=".docx,.pptx,.xlsx" className="hidden" onChange={compressFile} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Slides" replaces="PowerPoint" blurb="Outline a deck as slide titles and bullets, then save a real .pptx.">
          <button className={btn} onClick={() => { hist.reset([{ title: "", body: "" }]); setIdx(0); setFileName("presentation"); setNotice("New blank presentation."); }}>
            <FilePlus size={14} /> New
          </button>
          <button className={btn} onClick={() => openRef.current?.click()}><FolderOpen size={14} /> Open</button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo"><Undo2 size={14} /></button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo"><Redo2 size={14} /></button>
          <button className={btn} onClick={() => compressRef.current?.click()}><Minimize2 size={14} /> Compress a file</button>
          <button className={btnPrimary} disabled={!!busy} onClick={save}><Download size={14} /> Save .pptx</button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {(busy || notice) && <p className="mb-3 text-sm text-accent">{busy ?? notice}</p>}

        <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
          <div className="flex gap-2 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-2 lg:max-h-[calc(100vh-220px)] lg:flex-col">
            {slides.map((s, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`w-40 shrink-0 rounded-lg border-2 p-1 text-left lg:w-full ${i === idx ? "border-accent" : "border-transparent hover:border-slate-600"}`}>
                <SlideView s={s} small theme={theme} />
                <span className="mt-1 block text-[10px] text-slate-400">Slide {i + 1}</span>
              </button>
            ))}
            <button className={`${btn} shrink-0 justify-center`} onClick={() => add()}><Plus size={14} /> Add slide</button>
          </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-800 bg-[#0A0D12] p-4 sm:p-8">
            <SlideView s={cur} theme={theme} />
            <p className="text-center font-mono text-[11px] text-slate-500">Slide {idx + 1} of {slides.length} · ↑/↓ to move between slides</p>
          </div>

          <aside className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4" onBlur={hist.commit}>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Title</span>
              <input className={inputCls} value={cur.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Slide title" />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Body · one bullet per line</span>
              <textarea className={inputCls} rows={8} value={cur.body} onChange={(e) => patch({ body: e.target.value })} placeholder="Slide body text" />
            </label>
            <div className="flex flex-wrap gap-1">
              <button className={iconBtn} onClick={() => move(-1)} title="Move up"><ArrowUp size={14} /></button>
              <button className={iconBtn} onClick={() => move(1)} title="Move down"><ArrowDown size={14} /></button>
              <button className={btn} onClick={() => add(true)}><Copy size={14} /> Duplicate</button>
              <button className={btn} onClick={remove}><Trash2 size={14} /> Delete</button>
            </div>
            <span className={`${labelCls} mt-2`}>Theme</span>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button key={t.name} onClick={() => setTheme(t)} className={`rounded-md border-2 p-2 text-left text-xs ${theme.name === t.name ? "border-accent" : "border-slate-700"}`} style={{ background: t.background, color: t.accent }}>
                  <span className="font-bold">{t.name}</span>
                </button>
              ))}
            </div>
            <label className="mt-2 flex flex-col gap-1">
              <span className={labelCls}>File name</span>
              <input className={inputCls} value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </label>
          </aside>
        </div>
      </div>
    </div>
  );
}
