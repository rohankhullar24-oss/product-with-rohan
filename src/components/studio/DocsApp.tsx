"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Download, FilePlus, FileText, FolderOpen, Minimize2, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { AppHeader, ErrorBanner, btn, btnPrimary, downloadBlob, handleUndoKeys, useHistory, useKeys } from "./shared";
import { blankDocx, fromPlainText, readDocx, writeDocx } from "@/lib/office/docx";
import type { DocxDocument, Paragraph } from "@/lib/office/docx";
import { paragraphsToPdf, pdfToParagraphs } from "@/lib/office/pdf";
import { compressOoxml, formatBytes } from "@/lib/office/compress";
import { takeHandOff } from "@/lib/office/handoff";

// Word editor in the shape of reminder-app's DocxEditorActivity: a list of
// paragraphs, each with a whole-paragraph bold/italic toggle. Opening a PDF
// converts it to paragraphs (DocumentConverter.pdfToDocx); "Convert to PDF"
// goes the other way.

type State = { paragraphs: Paragraph[] };

function AutoTextarea({ value, onChange, bold, italic, onEnter, onBackspaceEmpty, inputRef }: {
  value: string;
  onChange: (v: string) => void;
  bold: boolean;
  italic: boolean;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  inputRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        inputRef(el);
      }}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Backspace" && !value) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
      placeholder="Paragraph text"
      className={`w-full resize-none overflow-hidden bg-transparent font-serif text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-300 ${
        bold ? "font-bold" : ""
      } ${italic ? "italic" : ""}`}
    />
  );
}

export default function DocsApp() {
  const hist = useHistory<State>(() => ({ paragraphs: blankDocx().paragraphs }));
  const { paragraphs } = hist.state;
  const [source, setSource] = useState<DocxDocument["source"]>();
  const [name, setName] = useState("document");
  const [active, setActive] = useState(0);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openRef = useRef<HTMLInputElement>(null);
  const compressRef = useRef<HTMLInputElement>(null);
  const inputs = useRef(new Map<number, HTMLTextAreaElement>());

  useEffect(() => {
    if (focusIdx === null) return;
    inputs.current.get(focusIdx)?.focus();
  }, [focusIdx, paragraphs.length]);

  useEffect(() => {
    const f = takeHandOff("docs");
    if (f) void openFile(f);
    // Only on mount: a hand-off from the Viewer arrives once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setParas(fn: (p: Paragraph[]) => Paragraph[], commit = true) {
    hist.set((s) => ({ paragraphs: fn(s.paragraphs) }), commit);
  }

  async function openFile(f: File) {
    setError(null);
    setNotice(null);
    setBusy("Opening…");
    try {
      const base = f.name.replace(/\.[^.]+$/, "");
      if (/\.pdf$/i.test(f.name)) {
        const paras = await pdfToParagraphs(new Uint8Array(await f.arrayBuffer()));
        hist.reset({ paragraphs: paras });
        setSource(undefined);
        setNotice("Converted from PDF: text only, no layout or images.");
      } else if (/\.txt$/i.test(f.name)) {
        hist.reset({ paragraphs: fromPlainText(await f.text()).paragraphs });
        setSource(undefined);
      } else {
        const doc = await readDocx(await f.arrayBuffer());
        hist.reset({ paragraphs: doc.paragraphs });
        setSource(doc.source);
        setNotice("Opened. Styling beyond whole-paragraph bold and italic isn't shown; the file's page setup and styles are kept on save.");
      }
      setName(base);
      setActive(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that file.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("Saving…");
    try {
      downloadBlob(await writeDocx({ paragraphs, source }), `${name}.docx`);
    } catch {
      setError("Couldn't save the document.");
    } finally {
      setBusy(null);
    }
  }

  async function toPdf() {
    setBusy("Converting…");
    try {
      const bytes = await paragraphsToPdf(paragraphs, name);
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${name}.pdf`);
      setNotice("Converted to PDF.");
    } catch {
      setError("Couldn't convert to PDF.");
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

  function insertAfter(i: number) {
    setParas((ps) => [...ps.slice(0, i + 1), { text: "", bold: false, italic: false }, ...ps.slice(i + 1)]);
    setActive(i + 1);
    setFocusIdx(i + 1);
  }

  function remove(i: number) {
    if (paragraphs.length === 1) return setParas(() => [{ text: "", bold: false, italic: false }]);
    setParas((ps) => ps.filter((_, j) => j !== i));
    const next = Math.max(0, i - 1);
    setActive(next);
    setFocusIdx(next);
  }

  function move(i: number, dir: 1 | -1) {
    const j = i + dir;
    if (j < 0 || j >= paragraphs.length) return;
    setParas((ps) => {
      const out = [...ps];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
    setActive(j);
  }

  useKeys((e) => {
    handleUndoKeys(e, hist.undo, hist.redo);
  });

  const words = paragraphs.reduce((n, p) => n + (p.text.trim() ? p.text.trim().split(/\s+/).length : 0), 0);
  const cur = paragraphs[active] ?? paragraphs[0];
  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={openRef} type="file" accept=".docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void openFile(f); }} />
      <input ref={compressRef} type="file" accept=".docx,.pptx,.xlsx" className="hidden" onChange={compressFile} />
      <div className="mx-auto max-w-[1100px]">
        <AppHeader name="Docs" replaces="Word" blurb="Write, open and save .docx files, convert to and from PDF. Nothing leaves your browser.">
          <button className={btn} onClick={() => { hist.reset({ paragraphs: blankDocx().paragraphs }); setSource(undefined); setName("document"); setNotice("New blank document."); }}>
            <FilePlus size={14} /> New
          </button>
          <button className={btn} onClick={() => openRef.current?.click()}>
            <FolderOpen size={14} /> Open
          </button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo"><Undo2 size={14} /></button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo"><Redo2 size={14} /></button>
          <button className={btn} onClick={() => compressRef.current?.click()} title="Shrink any .docx, .pptx or .xlsx">
            <Minimize2 size={14} /> Compress a file
          </button>
          <button className={btn} disabled={!!busy} onClick={toPdf}>
            <FileText size={14} /> Convert to PDF
          </button>
          <button className={btnPrimary} disabled={!!busy} onClick={save}>
            <Download size={14} /> Save .docx
          </button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {(busy || notice) && <p className="mb-3 text-sm text-accent">{busy ?? notice}</p>}

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-48 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white" aria-label="File name" />
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <button
            className={`${iconBtn} font-bold ${cur?.bold ? "border-accent text-white" : ""}`}
            onClick={() => setParas((ps) => ps.map((p, j) => (j === active ? { ...p, bold: !p.bold } : p)))}
            aria-pressed={cur?.bold}
            title="Bold paragraph"
          >
            B
          </button>
          <button
            className={`${iconBtn} italic ${cur?.italic ? "border-accent text-white" : ""}`}
            onClick={() => setParas((ps) => ps.map((p, j) => (j === active ? { ...p, italic: !p.italic } : p)))}
            aria-pressed={cur?.italic}
            title="Italic paragraph"
          >
            I
          </button>
          <button className={iconBtn} onClick={() => move(active, -1)} title="Move paragraph up"><ArrowUp size={14} /></button>
          <button className={iconBtn} onClick={() => move(active, 1)} title="Move paragraph down"><ArrowDown size={14} /></button>
          <button className={btn} onClick={() => insertAfter(active)}><Plus size={14} /> Add paragraph</button>
          <button className={iconBtn} onClick={() => remove(active)} title="Delete paragraph"><Trash2 size={14} /></button>
          <span className="ml-auto font-mono text-[11px] text-slate-500">
            {paragraphs.length} paragraph{paragraphs.length === 1 ? "" : "s"} · {words} words
          </span>
        </div>

        <div className="flex justify-center rounded-xl border border-slate-800 bg-[#0A0D12] p-4 sm:p-8">
          <div className="w-full max-w-[794px] bg-white px-6 py-10 shadow-2xl sm:px-16 sm:py-16" onBlur={hist.commit}>
            {paragraphs.map((p, i) => (
              <div key={i} onFocus={() => setActive(i)} className={`-mx-3 rounded px-3 ${i === active ? "bg-teal-50" : ""}`}>
                <AutoTextarea
                  value={p.text}
                  bold={p.bold}
                  italic={p.italic}
                  inputRef={(el) => {
                    if (el) inputs.current.set(i, el);
                    else inputs.current.delete(i);
                  }}
                  onChange={(v) => setParas((ps) => ps.map((x, j) => (j === i ? { ...x, text: v } : x)), false)}
                  onEnter={() => insertAfter(i)}
                  onBackspaceEmpty={() => remove(i)}
                />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Enter starts a new paragraph, Shift+Enter a line break, Backspace on an empty paragraph removes it.</p>
      </div>
    </div>
  );
}
