"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, PencilLine } from "lucide-react";
import { AppHeader, ErrorBanner, btn, btnPrimary } from "./shared";
import { handOff } from "@/lib/office/handoff";
import { pruneMissingParts } from "@/lib/office/pptx";
import type { Workbook, Worksheet } from "exceljs";

// Read-only Office viewer, the browser twin of reminder-app's
// OfficePreviewActivity (same libraries: docx-preview, pptx-preview,
// ExcelJS). "Edit text" hands the file to the matching editor.

const MAX_MB = 50;
type Kind = "docx" | "pptx" | "xlsx";
const EDITOR: Record<Kind, string> = { docx: "docs", pptx: "slides", xlsx: "sheets" };
const MAX_ROWS = 500;
const MAX_COLS = 60;

function kindOf(name: string): Kind | null {
  const ext = name.toLowerCase().split(".").pop();
  return ext === "docx" || ext === "pptx" || ext === "xlsx" ? ext : null;
}

function argb(c?: { argb?: string }) {
  const v = c?.argb;
  return v && v.length === 8 ? `#${v.slice(2)}` : undefined;
}

function SheetTable({ ws }: { ws: Worksheet }) {
  const rows = Math.min(ws.rowCount, MAX_ROWS);
  const cols = Math.min(ws.columnCount, MAX_COLS);
  // Merged ranges: the top-left cell spans, the rest are skipped.
  const spans = new Map<string, { rowSpan: number; colSpan: number }>();
  const hidden = new Set<string>();
  const decode = (ref: string) => {
    const m = ref.match(/^([A-Z]+)(\d+)$/)!;
    const col = m[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    return { r: Number(m[2]), c: col };
  };
  for (const range of (ws.model as { merges?: string[] }).merges ?? []) {
    const [a, b] = range.split(":").map(decode);
    spans.set(`${a.r}:${a.c}`, { rowSpan: b.r - a.r + 1, colSpan: b.c - a.c + 1 });
    for (let r = a.r; r <= b.r; r++) for (let c = a.c; c <= b.c; c++) if (r !== a.r || c !== a.c) hidden.add(`${r}:${c}`);
  }
  return (
    <table className="border-collapse text-[13px] text-slate-900">
      <colgroup>
        {Array.from({ length: cols }, (_, i) => (
          <col key={i} style={{ width: Math.round((ws.getColumn(i + 1).width ?? 10) * 7.5) }} />
        ))}
      </colgroup>
      <tbody>
        {Array.from({ length: rows }, (_, ri) => {
          const row = ws.getRow(ri + 1);
          return (
            <tr key={ri} style={{ height: row.height ? row.height * 1.33 : undefined }}>
              {Array.from({ length: cols }, (_, ci) => {
                const key = `${ri + 1}:${ci + 1}`;
                if (hidden.has(key)) return null;
                const cell = row.getCell(ci + 1);
                const f = cell.font ?? {};
                const fill = cell.fill as { type?: string; fgColor?: { argb?: string } } | undefined;
                const al = cell.alignment ?? {};
                return (
                  <td
                    key={ci}
                    {...spans.get(key)}
                    className="overflow-hidden border border-slate-200 px-1.5 py-0.5 align-bottom whitespace-pre"
                    style={{
                      fontWeight: f.bold ? 700 : undefined,
                      fontStyle: f.italic ? "italic" : undefined,
                      textDecoration: f.underline ? "underline" : undefined,
                      color: argb(f.color),
                      fontSize: f.size ? `${f.size * 1.2}px` : undefined,
                      background: fill?.type === "pattern" ? argb(fill.fgColor) : undefined,
                      textAlign: (al.horizontal as "left" | "center" | "right" | undefined) ?? (typeof cell.value === "number" ? "right" : undefined),
                      verticalAlign: al.vertical === "middle" ? "middle" : al.vertical === "top" ? "top" : undefined,
                      whiteSpace: al.wrapText ? "pre-wrap" : "pre",
                    }}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ViewerApp() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const openRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  async function open(f: File) {
    setError(null);
    const k = kindOf(f.name);
    if (!k) return setError("Only .docx, .pptx and .xlsx files can be viewed (not old .doc/.ppt/.xls).");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`That file is larger than ${MAX_MB} MB, too big to preview here.`);
    cleanup.current?.();
    cleanup.current = null;
    setFile(f);
    setKind(k);
    setWorkbook(null);
    setBusy(true);
    try {
      if (k === "xlsx") {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await f.arrayBuffer());
        setWorkbook(wb);
        setSheetIdx(0);
      } else {
        // Let React mount the container before rendering into it.
        await new Promise((r) => requestAnimationFrame(r));
        const el = docRef.current!;
        el.innerHTML = "";
        if (k === "docx") {
          const { renderAsync } = await import("docx-preview");
          await renderAsync(f, el, undefined, { inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: false });
        } else {
          const [{ init }, JSZip] = await Promise.all([import("pptx-preview"), import("jszip").then((m) => m.default)]);
          // pptx-preview stops at the first manifest entry it can't find, so
          // tidy those out first (decks from pptxgenjs and some exporters have them).
          const zip = await JSZip.loadAsync(await f.arrayBuffer());
          const buf = (await pruneMissingParts(zip)) ? await zip.generateAsync({ type: "arraybuffer" }) : await f.arrayBuffer();
          const width = Math.min(el.clientWidth - 32, 1100);
          const previewer = init(el, { width, height: Math.round((width * 9) / 16), mode: "list" });
          await previewer.preview(buf);
          if (!previewer.slideCount) throw new Error("no slides could be read from this deck");
          cleanup.current = () => previewer.destroy();
        }
      }
    } catch (e) {
      setError(`Couldn't display this file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void open(f);
  }

  function editText() {
    if (!file || !kind) return;
    handOff(EDITOR[kind], file);
    router.push(`/projects/studio/${EDITOR[kind]}`);
  }

  const ws = workbook?.worksheets[sheetIdx];

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={openRef} type="file" accept=".docx,.pptx,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void open(f); }} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Viewer" replaces="Office viewer" blurb="See a .docx, .pptx or .xlsx the way Office shows it: layout, images and colors. Read-only.">
          <button className={btn} onClick={() => openRef.current?.click()}><FolderOpen size={14} /> {file ? "Open another…" : "Open file"}</button>
          <button className={btnPrimary} disabled={!file} onClick={editText}><PencilLine size={14} /> Edit text</button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {file && (
          <p className="mb-3 text-sm text-slate-400">
            {busy ? "Loading…" : file.name}
            {!busy && " · Edit text opens it in the editor (text only)."}
          </p>
        )}

        {kind === "xlsx" && workbook && workbook.worksheets.length > 1 && (
          <div className="mb-2 flex gap-1 overflow-x-auto">
            {workbook.worksheets.map((w, i) => (
              <button key={w.id} onClick={() => setSheetIdx(i)} className={`shrink-0 rounded-t-md px-3 py-1.5 text-xs ${i === sheetIdx ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                {w.name}
              </button>
            ))}
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`h-[72vh] overflow-auto rounded-xl border bg-slate-200 lg:h-[calc(100vh-230px)] ${dragOver ? "border-accent" : "border-slate-800"}`}
        >
          {!file ? (
            <button onClick={() => openRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-500 hover:text-slate-800">
              <FolderOpen size={28} />
              <span className="text-sm">Pick or drop a Word, PowerPoint or Excel file to view.</span>
            </button>
          ) : kind === "xlsx" ? (
            ws ? (
              <div className="min-w-max bg-white p-2">
                <SheetTable ws={ws} />
                {(ws.rowCount > MAX_ROWS || ws.columnCount > MAX_COLS) && (
                  <p className="p-2 text-xs text-slate-500">Showing the first {MAX_ROWS} rows and {MAX_COLS} columns.</p>
                )}
              </div>
            ) : null
          ) : (
            <div
              ref={docRef}
              className="flex min-h-full flex-col items-center p-4 [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.pptx-preview-wrapper]:!h-auto [&_.pptx-preview-wrapper]:!overflow-visible [&_.pptx-preview-wrapper]:!bg-transparent [&_.pptx-preview-slide-wrapper]:!mx-auto [&_.pptx-preview-slide-wrapper]:!mb-3 [&_.pptx-preview-slide-wrapper]:shadow-md"
            />
          )}
        </div>
      </div>
    </div>
  );
}
