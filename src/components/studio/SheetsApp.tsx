"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Columns3, Download, FilePlus, FileSpreadsheet, FolderOpen, Minimize2, Redo2, Rows3, Trash2, Undo2 } from "lucide-react";
import { AppHeader, ErrorBanner, btn, btnPrimary, downloadBlob, handleUndoKeys, useHistory, useKeys } from "./shared";
import { blankGrid, columnName, csvToGrid, gridToCsv, readXlsx, writeXlsx } from "@/lib/office/xlsx";
import type { Grid, Sheet } from "@/lib/office/xlsx";
import { compressOoxml, formatBytes } from "@/lib/office/compress";
import { takeHandOff } from "@/lib/office/handoff";

// A plain data grid, like reminder-app's SpreadsheetActivity: edit cells,
// add/delete rows and columns, open/save .xlsx (first sheet only; the rest
// of the workbook rides along untouched), plus CSV in and out.

export default function SheetsApp() {
  const hist = useHistory<Grid>(() => blankGrid());
  const grid = hist.state;
  const [meta, setMeta] = useState<Omit<Sheet, "grid">>({ name: "Sheet1", sheetCount: 1 });
  const [fileName, setFileName] = useState("spreadsheet");
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openRef = useRef<HTMLInputElement>(null);
  const compressRef = useRef<HTMLInputElement>(null);
  const cells = useRef(new Map<string, HTMLInputElement>());

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  useEffect(() => {
    cells.current.get(`${sel.r}:${sel.c}`)?.focus();
  }, [sel]);

  useEffect(() => {
    const f = takeHandOff("sheets");
    if (f) void openFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openFile(f: File) {
    setError(null);
    setNotice(null);
    setBusy("Opening…");
    try {
      if (/\.csv$/i.test(f.name)) {
        hist.reset(csvToGrid(await f.text()));
        setMeta({ name: "Sheet1", sheetCount: 1 });
      } else {
        const sheet = await readXlsx(await f.arrayBuffer());
        hist.reset(sheet.grid);
        setMeta({ name: sheet.name, sheetCount: sheet.sheetCount, workbook: sheet.workbook });
        setNotice(
          sheet.sheetCount > 1
            ? `Opened "${sheet.name}". The other ${sheet.sheetCount - 1} sheet(s) aren't shown but are kept when you save.`
            : "Opened. Formulas show their last value; saving keeps cells you didn't touch."
        );
      }
      setFileName(f.name.replace(/\.[^.]+$/, ""));
      setSel({ r: 0, c: 0 });
    } catch (e) {
      setError(e instanceof Error ? `Couldn't open that file: ${e.message}` : "Couldn't open that file.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("Saving…");
    try {
      downloadBlob(await writeXlsx({ grid, ...meta }), `${fileName}.xlsx`);
      setNotice("Saved.");
    } catch {
      setError("Couldn't save the spreadsheet.");
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
        setNotice(`Compressed ${f.name}: ${formatBytes(r.before)} → ${formatBytes(r.after)}.`);
      }
    } catch {
      setError("That doesn't look like a Word, PowerPoint or Excel file.");
    } finally {
      setBusy(null);
    }
  }

  const setCell = (r: number, c: number, v: string) =>
    hist.set((g) => g.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)), false);
  const addRow = () => hist.set((g) => [...g.slice(0, sel.r + 1), Array(cols).fill(""), ...g.slice(sel.r + 1)]);
  const addCol = () => hist.set((g) => g.map((row) => [...row.slice(0, sel.c + 1), "", ...row.slice(sel.c + 1)]));
  const delRow = () => rows > 1 && (hist.set((g) => g.filter((_, i) => i !== sel.r)), setSel((s) => ({ ...s, r: Math.min(s.r, rows - 2) })));
  const delCol = () => cols > 1 && (hist.set((g) => g.map((row) => row.filter((_, j) => j !== sel.c))), setSel((s) => ({ ...s, c: Math.min(s.c, cols - 2) })));

  function onCellKey(e: KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    const move = (dr: number, dc: number) => {
      e.preventDefault();
      hist.commit();
      setSel({ r: Math.min(rows - 1, Math.max(0, r + dr)), c: Math.min(cols - 1, Math.max(0, c + dc)) });
    };
    if (e.key === "Enter") move(e.shiftKey ? -1 : 1, 0);
    else if (e.key === "Tab") move(0, e.shiftKey ? -1 : 1);
    else if (e.key === "ArrowDown") move(1, 0);
    else if (e.key === "ArrowUp") move(-1, 0);
    else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) move(0, -1);
    else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) move(0, 1);
  }

  useKeys((e) => handleUndoKeys(e, hist.undo, hist.redo));

  const numeric = grid.flat().filter((v) => v.trim() && !isNaN(Number(v)));
  const sum = numeric.reduce((a, v) => a + Number(v), 0);
  const iconBtn = `${btn} px-2`;

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={openRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void openFile(f); }} />
      <input ref={compressRef} type="file" accept=".docx,.pptx,.xlsx" className="hidden" onChange={compressFile} />
      <div className="mx-auto max-w-[1500px]">
        <AppHeader name="Sheets" replaces="Excel" blurb="Open, edit and save .xlsx or CSV as a plain data grid. No formulas or charts.">
          <button className={btn} onClick={() => { hist.reset(blankGrid()); setMeta({ name: "Sheet1", sheetCount: 1 }); setFileName("spreadsheet"); setNotice("New blank sheet."); }}>
            <FilePlus size={14} /> New
          </button>
          <button className={btn} onClick={() => openRef.current?.click()}><FolderOpen size={14} /> Open</button>
          <button className={iconBtn} disabled={!hist.canUndo} onClick={hist.undo} title="Undo"><Undo2 size={14} /></button>
          <button className={iconBtn} disabled={!hist.canRedo} onClick={hist.redo} title="Redo"><Redo2 size={14} /></button>
          <button className={btn} onClick={() => compressRef.current?.click()}><Minimize2 size={14} /> Compress a file</button>
          <button className={btn} onClick={() => downloadBlob(new Blob([gridToCsv(grid)], { type: "text/csv" }), `${fileName}.csv`)}>
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button className={btnPrimary} disabled={!!busy} onClick={save}><Download size={14} /> Save .xlsx</button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />
        {(busy || notice) && <p className="mb-3 text-sm text-accent">{busy ?? notice}</p>}

        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-44 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white" aria-label="File name" />
          <span className="font-mono text-xs text-slate-400">{columnName(sel.c)}{sel.r + 1}</span>
          <input
            value={grid[sel.r]?.[sel.c] ?? ""}
            onChange={(e) => setCell(sel.r, sel.c, e.target.value)}
            onBlur={hist.commit}
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-white"
            aria-label="Cell contents"
          />
          <button className={btn} onClick={addRow}><Rows3 size={14} /> Add row</button>
          <button className={btn} onClick={addCol}><Columns3 size={14} /> Add column</button>
          <button className={btn} onClick={delRow} disabled={rows < 2}><Trash2 size={14} /> Row</button>
          <button className={btn} onClick={delCol} disabled={cols < 2}><Trash2 size={14} /> Column</button>
        </div>

        <div className="h-[65vh] overflow-auto rounded-xl border border-slate-800 bg-white lg:h-[calc(100vh-290px)]">
          <table className="border-collapse text-sm text-slate-900">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 w-10 border border-slate-300 bg-slate-100" />
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} className={`min-w-24 border border-slate-300 px-2 py-1 text-xs font-medium ${c === sel.c ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-500"}`}>
                    {columnName(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  <th className={`sticky left-0 border border-slate-300 px-2 text-right text-xs font-medium ${r === sel.r ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-500"}`}>{r + 1}</th>
                  {row.map((v, c) => (
                    <td key={c} className={`border border-slate-200 p-0 ${r === sel.r && c === sel.c ? "outline outline-2 -outline-offset-2 outline-teal-600" : ""}`}>
                      <input
                        ref={(el) => {
                          if (el) cells.current.set(`${r}:${c}`, el);
                          else cells.current.delete(`${r}:${c}`);
                        }}
                        value={v}
                        onFocus={() => setSel({ r, c })}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onBlur={hist.commit}
                        onKeyDown={(e) => onCellKey(e, r, c)}
                        className={`w-full min-w-24 bg-transparent px-2 py-1 outline-none ${v.trim() && !isNaN(Number(v)) ? "text-right tabular-nums" : ""}`}
                        aria-label={`${columnName(c)}${r + 1}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-slate-500">
          <span>{rows} rows × {cols} columns</span>
          {numeric.length > 0 && <span>Sum of numbers: {sum.toLocaleString()}</span>}
          <span>Enter / Tab / arrows to move · Ctrl+Z undo</span>
        </p>
      </div>
    </div>
  );
}
