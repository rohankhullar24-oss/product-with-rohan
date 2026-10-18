"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Archive, Download, File as FileIcon, Folder, FolderDown, FolderOpen, FolderPlus, Lock, Plus, Trash2 } from "lucide-react";
import type { Entry, FileEntry } from "@zip.js/zip.js";
import { AppHeader, ErrorBanner, Panel, btn, btnPrimary, downloadBlob, inputCls, labelCls } from "./shared";
import { formatBytes } from "@/lib/office/compress";

// Zip extraction like reminder-app's ZipExtractorActivity (password-protected
// zips included, ZipCrypto and AES), plus creating zips. "Extract all" writes
// a real folder via the File System Access API where the browser has it.

type DirHandle = {
  getDirectoryHandle(name: string, o?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, o?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> }>;
};
type PickerWindow = Window & { showDirectoryPicker?: (o?: { mode?: string }) => Promise<DirHandle> };

const TEXT_EXT = /\.(txt|md|csv|json|xml|html?|css|js|ts|tsx|jsx|log|ini|ya?ml|svg|py|kt|java|c|h|cpp|sh|sql|toml)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;

async function zipjs() {
  const zip = await import("@zip.js/zip.js");
  // Inline web workers fight with the bundler; the main thread is fine here.
  zip.configure({ useWebWorkers: false });
  return zip;
}

// zip.js says "Invalid password" for a wrong one and "File contains encrypted entry" for none.
const isPasswordError = (e: unknown) => e instanceof Error && /password|encrypted/i.test(e.message);

export default function ZipApp() {
  const [tab, setTab] = useState<"open" | "create">("open");
  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-[1300px]">
        <AppHeader name="Zip" replaces="WinZip" blurb="Look inside zip files, extract them (even password-protected ones) and make new zips. Nothing is uploaded.">
          <div className="flex rounded-md border border-slate-700 p-0.5">
            {(["open", "create"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1 text-xs ${tab === t ? "bg-slate-700 text-white" : "text-slate-400"}`}>
                {t === "open" ? "Extract" : "Create"}
              </button>
            ))}
          </div>
        </AppHeader>
        {tab === "open" ? <Extractor /> : <Creator />}
      </div>
    </div>
  );
}

function Extractor() {
  const [zipName, setZipName] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [preview, setPreview] = useState<{ name: string; text?: string; url?: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const openRef = useRef<HTMLInputElement>(null);
  const canPickFolder = typeof window !== "undefined" && !!(window as PickerWindow).showDirectoryPicker;

  useEffect(() => {
    const url = preview?.url;
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [preview]);

  async function open(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setPreview(null);
    setStatus("Reading…");
    try {
      const { ZipReader, BlobReader } = await zipjs();
      const list = await new ZipReader(new BlobReader(f)).getEntries();
      setEntries(list);
      setZipName(f.name);
      setNeedsPassword(list.some((x) => x.encrypted));
      setPassword("");
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(`Couldn't read that file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function read(entry: FileEntry): Promise<Blob> {
    const { BlobWriter } = await zipjs();
    return entry.getData(new BlobWriter(), entry.encrypted ? { password } : undefined);
  }

  async function guarded<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    try {
      return await fn();
    } catch (e) {
      if (isPasswordError(e)) setError(password ? "Wrong password. Try again." : "This zip is password-protected. Enter the password above.");
      else setError(`Extraction failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function show(entry: FileEntry) {
    await guarded(async () => {
      const blob = await read(entry);
      if (TEXT_EXT.test(entry.filename)) setPreview({ name: entry.filename, text: (await blob.text()).slice(0, 200_000) });
      else if (IMAGE_EXT.test(entry.filename)) setPreview({ name: entry.filename, url: URL.createObjectURL(blob) });
      else setPreview({ name: entry.filename });
    });
  }

  async function extractAll() {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) return;
    let root: DirHandle;
    try {
      root = await picker({ mode: "readwrite" });
    } catch {
      return; // picker cancelled
    }
    await guarded(async () => {
      let copied = 0;
      for (const entry of entries) {
        const parts = entry.filename.split("/").filter((p) => p && p !== "." && p !== "..");
        if (!parts.length) continue;
        let dir = root;
        const dirs = entry.directory ? parts : parts.slice(0, -1);
        for (const d of dirs) dir = await dir.getDirectoryHandle(d, { create: true });
        if (entry.directory) continue;
        setStatus(`Extracting ${entry.filename}`);
        const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
        const w = await fh.createWritable();
        await w.write(await read(entry as FileEntry));
        await w.close();
        copied++;
      }
      setStatus(`Extracted ${copied} file(s).`);
    });
  }

  const files = entries.filter((e) => !e.directory);
  const total = files.reduce((n, e) => n + e.uncompressedSize, 0);
  const shown = entries.filter((e) => e.filename.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <input ref={openRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" onChange={open} />
      <ErrorBanner message={error} onClose={() => setError(null)} />
      {status && <p className="mb-3 text-sm text-accent">{status}</p>}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button className={btn} onClick={() => openRef.current?.click()}><FolderOpen size={14} /> {zipName ? "Open another zip" : "Choose zip file"}</button>
            {zipName && (
              <>
                <span className="truncate text-sm text-white">{zipName}</span>
                <span className="font-mono text-[11px] text-slate-500">{files.length} files · {formatBytes(total)}</span>
                <button className={`${btnPrimary} ml-auto`} disabled={!canPickFolder} onClick={extractAll} title={canPickFolder ? "Write everything into a folder you pick" : "Your browser can't write folders; download files one by one"}>
                  <FolderDown size={14} /> Extract all to folder…
                </button>
              </>
            )}
          </div>
          {needsPassword && (
            <label className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              <Lock size={14} /> This zip is password-protected.
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Zip password" className={`${inputCls} ml-auto w-48`} />
            </label>
          )}
          {zipName ? (
            <>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter files" className={`${inputCls} mb-2 w-full`} />
              <ul className="max-h-[55vh] overflow-auto">
                {shown.map((e) => {
                  const depth = e.filename.replace(/\/$/, "").split("/").length - 1;
                  const base = e.filename.replace(/\/$/, "").split("/").pop();
                  return (
                    <li key={e.filename} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-800" style={{ paddingLeft: 8 + depth * 16 }}>
                      {e.directory ? <Folder size={14} className="shrink-0 text-amber-400" /> : <FileIcon size={14} className="shrink-0 text-slate-400" />}
                      {e.directory ? (
                        <span className="min-w-0 flex-1 truncate text-slate-300">{base}</span>
                      ) : (
                        <button className="min-w-0 flex-1 truncate text-left text-slate-200 hover:text-accent" onClick={() => show(e as FileEntry)}>{base}</button>
                      )}
                      {e.encrypted && <Lock size={12} className="shrink-0 text-amber-400" />}
                      {!e.directory && (
                        <>
                          <span className="shrink-0 font-mono text-[11px] text-slate-500">{formatBytes(e.uncompressedSize)}</span>
                          <button
                            className="shrink-0 text-slate-400 hover:text-white"
                            title="Download"
                            onClick={() => guarded(async () => downloadBlob(await read(e as FileEntry), base ?? "file"))}
                          >
                            <Download size={14} />
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!canPickFolder && <p className="mt-2 text-xs text-slate-500">This browser can&apos;t write folders, so download files individually (Chrome and Edge can extract everything at once).</p>}
            </>
          ) : (
            <button onClick={() => openRef.current?.click()} className="flex h-[40vh] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-700 text-slate-400 hover:border-accent hover:text-white">
              <Archive size={28} />
              <span className="text-sm">Pick a zip file to see what&apos;s inside.</span>
            </button>
          )}
        </div>
        <Panel title={preview ? preview.name.split("/").pop() : "Preview"}>
          {!preview ? (
            <p className="text-xs text-slate-500">Click a file to preview text and images.</p>
          ) : preview.text !== undefined ? (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-300">{preview.text}</pre>
          ) : preview.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt={preview.name} className="max-h-[60vh] w-full rounded object-contain" />
          ) : (
            <p className="text-xs text-slate-500">No preview for this file type. Use the download button.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

type Pending = { path: string; file: File };

function Creator() {
  const [items, setItems] = useState<Pending[]>([]);
  const [name, setName] = useState("archive");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState(6);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  function add(e: ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    setItems((cur) => {
      const seen = new Set(cur.map((i) => i.path));
      const next = list
        .map((f) => ({ path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, file: f }))
        .filter((i) => !seen.has(i.path));
      return [...cur, ...next];
    });
  }

  async function build() {
    setError(null);
    try {
      const { ZipWriter, BlobWriter, BlobReader } = await zipjs();
      const writer = new ZipWriter(new BlobWriter("application/zip"), {
        level,
        ...(password ? { password, encryptionStrength: 3 as const } : {}),
      });
      for (let i = 0; i < items.length; i++) {
        setStatus(`Adding ${i + 1} of ${items.length}: ${items[i].path}`);
        await writer.add(items[i].path, new BlobReader(items[i].file), { lastModDate: new Date(items[i].file.lastModified) });
      }
      const blob = await writer.close();
      downloadBlob(blob, `${name || "archive"}.zip`);
      const before = items.reduce((n, i) => n + i.file.size, 0);
      setStatus(`Created ${name}.zip: ${formatBytes(before)} → ${formatBytes(blob.size)}${password ? ", AES-256 encrypted" : ""}.`);
    } catch (e) {
      setStatus(null);
      setError(`Couldn't create the zip: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const total = items.reduce((n, i) => n + i.file.size, 0);

  return (
    <>
      <input ref={filesRef} type="file" multiple className="hidden" onChange={add} />
      <input ref={folderRef} type="file" multiple className="hidden" onChange={add} />
      <ErrorBanner message={error} onClose={() => setError(null)} />
      {status && <p className="mb-3 text-sm text-accent">{status}</p>}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <button className={btn} onClick={() => filesRef.current?.click()}><Plus size={14} /> Add files</button>
            <button className={btn} onClick={() => folderRef.current?.click()}><FolderPlus size={14} /> Add folder</button>
            {items.length > 0 && <button className={btn} onClick={() => setItems([])}><Trash2 size={14} /> Clear</button>}
            <span className="ml-auto font-mono text-[11px] text-slate-500">{items.length} files · {formatBytes(total)}</span>
          </div>
          {items.length ? (
            <ul className="max-h-[55vh] overflow-auto">
              {items.map((i) => (
                <li key={i.path} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-800">
                  <FileIcon size={14} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{i.path}</span>
                  <span className="font-mono text-[11px] text-slate-500">{formatBytes(i.file.size)}</span>
                  <button className="text-slate-400 hover:text-red-400" onClick={() => setItems((cur) => cur.filter((x) => x.path !== i.path))} aria-label={`Remove ${i.path}`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">Add files or a whole folder to zip them up.</p>
          )}
        </div>
        <Panel title="Zip settings">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>File name</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Password (optional, AES-256)</span>
              <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for no password" />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Compression</span>
              <select className={inputCls} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                <option value={0}>Store only (fastest)</option>
                <option value={6}>Normal</option>
                <option value={9}>Maximum (smallest)</option>
              </select>
            </label>
            <button className={btnPrimary} disabled={!items.length} onClick={build}><Archive size={14} /> Create zip</button>
          </div>
        </Panel>
      </div>
    </>
  );
}
