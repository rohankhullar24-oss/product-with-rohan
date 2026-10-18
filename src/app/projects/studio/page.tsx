import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO_APPS } from "@/components/studio/apps";

export const metadata: Metadata = {
  title: "Open Studio | Seven Free Creative Apps in Your Browser",
  description:
    "Free, browser-based alternatives to Photoshop, Illustrator, Premiere Pro, Lightroom, After Effects, InDesign, Acrobat, Word, Excel and PowerPoint, plus OCR and zip tools. No install, no account, and your files never leave your device.",
  keywords: ["adobe alternative", "office alternative", "free photo editor", "online video editor", "pdf editor", "docx editor", "xlsx editor", "ocr", "zip extractor"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/studio",
    title: "Open Studio",
    description: "Thirteen free creative and work apps that run in your browser. Nothing is uploaded.",
  },
};

export default function StudioHome() {
  return (
    <main className="px-3 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Side project · runs in your browser</p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Open Studio</h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          A creative suite with one app for each tool in Adobe&apos;s core lineup, inspired by ArtCraft&apos;s open-source push, plus a work
          suite of document tools brought over from the Reminders app. Everything runs on your device: no install, no account, no
          uploads.
        </p>

        {(
          [
            ["creative", "Creative suite", "Images, vectors, video, motion and layout."],
            ["work", "Work suite", "Documents, spreadsheets, slides, PDFs, scans and archives."],
          ] as const
        ).map(([group, heading, blurb]) => (
          <section key={group} className="mt-12">
            <h2 className="text-2xl font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-sm text-slate-400">{blurb}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STUDIO_APPS.filter((a) => a.group === group).map((a) => (
                <Link
                  key={a.slug}
                  href={`/projects/studio/${a.slug}`}
                  className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-semibold text-white">{a.name}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">replaces {a.replaces}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{a.tagline}</p>
                  <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate-300">
                    {a.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-accent">·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-5 text-sm font-medium text-accent group-hover:underline">Open {a.name} →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 grid gap-6 rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-white">Private by design</h3>
            <p className="mt-1">Images, video and PDFs are processed in this tab using canvas, Web Audio and plain JavaScript. Nothing is sent to a server.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Honest scope</h3>
            <p className="mt-1">These are the everyday 80% of each app, not a pro replacement. There are no RAW files, CMYK, masks, plugins, formulas or cloud sync. Scan downloads its OCR model once, the first time you use it.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Open formats out</h3>
            <p className="mt-1">Export PNG, JPG, SVG, WebM, PDF, DOCX, XLSX, PPTX, CSV and ZIP. Work isn&apos;t saved between visits, so export before you close the tab.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
