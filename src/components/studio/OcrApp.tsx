"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, Clipboard, Download, FileText, ImagePlus, ScanText } from "lucide-react";
import { AppHeader, ErrorBanner, btn, btnPrimary, downloadBlob, inputCls, labelCls } from "./shared";
import { fromPlainText, writeDocx } from "@/lib/office/docx";

// On-device OCR like reminder-app's OcrScanActivity, with tesseract.js
// (Tesseract compiled to WebAssembly) in place of Tesseract4Android. The
// engine and language model download once from jsDelivr and are cached by
// the browser; the image itself is never uploaded.

const LANGS: [string, string][] = [
  ["eng", "English"],
  ["hin", "Hindi"],
  ["spa", "Spanish"],
  ["fra", "French"],
  ["deu", "German"],
  ["ita", "Italian"],
  ["por", "Portuguese"],
  ["rus", "Russian"],
  ["ara", "Arabic"],
  ["chi_sim", "Chinese (simplified)"],
  ["jpn", "Japanese"],
  ["kor", "Korean"],
];

type Result = { text: string; confidence: number; pdf: Uint8Array | null };

export default function OcrApp() {
  const [image, setImage] = useState<{ url: string; file: Blob; name: string } | null>(null);
  const [lang, setLang] = useState("eng");
  const [progress, setProgress] = useState<{ status: string; value: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) return;
    return () => URL.revokeObjectURL(image.url);
  }, [image]);

  function choose(file: Blob, name: string) {
    setImage({ url: URL.createObjectURL(file), file, name: name.replace(/\.[^.]+$/, "") });
    setResult(null);
    setText("");
    setError(null);
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"))?.getAsFile();
      if (f) choose(f, "pasted-image");
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) choose(f, f.name);
  }

  async function recognize() {
    if (!image) return;
    setError(null);
    setProgress({ status: "Starting…", value: 0 });
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) =>
          setProgress({ status: m.status.replace(/^\w/, (c) => c.toUpperCase()), value: m.progress }),
      });
      const { data } = await worker.recognize(image.file, { pdfTitle: image.name }, { text: true, pdf: true });
      await worker.terminate();
      const out = { text: (data.text ?? "").trim(), confidence: data.confidence ?? 0, pdf: data.pdf ? new Uint8Array(data.pdf) : null };
      setResult(out);
      setText(out.text);
      if (!out.text) setError("No text recognized in that image. Try a sharper, well-lit photo, or another language.");
    } catch (e) {
      setError(`OCR failed: ${e instanceof Error ? e.message : String(e)}. The first run needs an internet connection to download the language model.`);
    } finally {
      setProgress(null);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const name = image?.name || "scan";

  return (
    <div className="px-3 py-4 sm:px-6">
      <input ref={pickRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <div className="mx-auto max-w-[1300px]">
        <AppHeader name="Scan" replaces="Acrobat Scan" blurb="Turn a photo or scanned page into editable, selectable text. Recognition runs in your browser.">
          <button className={btn} onClick={() => camRef.current?.click()}><Camera size={14} /> Take photo</button>
          <button className={btn} onClick={() => pickRef.current?.click()}><ImagePlus size={14} /> Pick image</button>
        </AppHeader>
        <ErrorBanner message={error} onClose={() => setError(null)} />

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex min-h-[50vh] flex-col rounded-xl border border-slate-800 bg-slate-900 p-3">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="Page to scan" className="max-h-[65vh] w-full flex-1 rounded-md bg-[#0A0D12] object-contain" />
            ) : (
              <button onClick={() => pickRef.current?.click()} className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-700 text-slate-400 hover:border-accent hover:text-white">
                <ScanText size={28} />
                <span className="text-sm">Take a photo of a printed page, pick an image, or paste one.</span>
              </button>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Language</span>
                <select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANGS.map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>
              <button className={btnPrimary} disabled={!image || !!progress} onClick={recognize}>
                <ScanText size={14} /> {progress ? "Recognizing…" : "Recognize text"}
              </button>
            </div>
            {progress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{progress.status}</span>
                  <span>{Math.round(progress.value * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(progress.value * 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-[50vh] flex-col rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className={labelCls}>Recognized text</span>
              {result && <span className="font-mono text-[11px] text-slate-500">confidence {Math.round(result.confidence)}%</span>}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Recognized text will appear here. Edit it if needed."
              className={`${inputCls} min-h-[40vh] flex-1 font-mono text-[13px] leading-relaxed`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={btn} disabled={!text} onClick={copy}><Clipboard size={14} /> {copied ? "Copied" : "Copy"}</button>
              <button className={btn} disabled={!text} onClick={() => downloadBlob(new Blob([text], { type: "text/plain" }), `${name}.txt`)}>
                <Download size={14} /> Save .txt
              </button>
              <button className={btn} disabled={!text} onClick={async () => downloadBlob(await writeDocx(fromPlainText(text)), `${name}.docx`)}>
                <FileText size={14} /> Save as Word
              </button>
              <button
                className={btn}
                disabled={!result?.pdf}
                onClick={() => result?.pdf && downloadBlob(new Blob([result.pdf as BlobPart], { type: "application/pdf" }), `${name}-searchable.pdf`)}
                title="The photo with an invisible, selectable text layer"
              >
                <Download size={14} /> Searchable PDF
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">The first scan in each language downloads its model (a few MB), then it&apos;s cached.</p>
      </div>
    </div>
  );
}
