import type { Workbook } from "exceljs";

// A plain data grid over the first worksheet, like reminder-app's
// XlsxEngine.kt: text and numbers only, no formulas or styling edits. The
// whole workbook is loaded with ExcelJS so the other sheets (and the first
// sheet's formatting) round-trip when saved.

export type Grid = string[][];
export type Sheet = { grid: Grid; name: string; workbook?: Workbook; sheetCount: number };

async function excel() {
  return (await import("exceljs")).default;
}

export function blankGrid(rows = 20, cols = 8): Grid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

export function columnName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export async function readXlsx(data: ArrayBuffer): Promise<Sheet> {
  const ExcelJS = await excel();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("That workbook has no sheets.");
  const rows = Math.max(ws.rowCount, 20);
  const cols = Math.max(ws.columnCount, 8);
  const grid = blankGrid(rows, cols);
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    row.eachCell({ includeEmpty: false }, (cell, c) => {
      // Merged ranges report the master's text from every cell; show it once.
      if (cell.isMerged && cell.master.address !== cell.address) return;
      grid[r - 1][c - 1] = cell.text ?? "";
    });
  });
  return { grid, name: ws.name, workbook, sheetCount: workbook.worksheets.length };
}

const NUMERIC = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

export async function writeXlsx(sheet: Sheet): Promise<Blob> {
  const ExcelJS = await excel();
  const workbook = sheet.workbook ?? new ExcelJS.Workbook();
  const ws = workbook.worksheets[0] ?? workbook.addWorksheet(sheet.name || "Sheet1");
  sheet.grid.forEach((row, r) =>
    row.forEach((value, c) => {
      const cell = ws.getCell(r + 1, c + 1);
      if (cell.isMerged && cell.master.address !== cell.address) return;
      const v = value.trim();
      const next = v === "" ? null : NUMERIC.test(v) ? Number(v) : value;
      // Leave untouched cells alone so their formulas/formatting survive.
      if (cell.text === value) return;
      cell.value = next;
    })
  );
  const buf = await workbook.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function gridToCsv(grid: Grid): string {
  const lastRow = grid.reduce((n, row, i) => (row.some((v) => v.trim()) ? i : n), -1);
  const lastCol = grid.reduce((n, row) => Math.max(n, row.reduce((m, v, j) => (v.trim() ? j : m), -1)), -1);
  return grid
    .slice(0, lastRow + 1)
    .map((row) =>
      row
        .slice(0, lastCol + 1)
        .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(",")
    )
    .join("\n");
}

export function csvToGrid(text: string): Grid {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  const cols = Math.max(8, ...rows.map((r) => r.length));
  const grid = rows.map((r) => [...r, ...Array(cols - r.length).fill("")]);
  while (grid.length < 20) grid.push(Array(cols).fill(""));
  return grid;
}
