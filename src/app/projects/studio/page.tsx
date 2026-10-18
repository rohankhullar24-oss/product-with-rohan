import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO_APPS } from "@/components/studio/apps";

export const metadata: Metadata = {
  title: "Open Studio | Seven Free Creative Apps in Your Browser",
  description:
    "Free, browser-based alternatives to Photoshop, Illustrator, Premiere Pro, Lightroom, After Effects, InDesign and Acrobat. No install, no account, and your files never leave your device.",
  keywords: ["adobe alternative", "free photo editor", "online video editor", "pdf editor", "vector editor", "browser creative suite"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/studio",
    title: "Open Studio",
    description: "Seven free creative apps that run in your browser. Nothing is uploaded.",
  },
};

export default function StudioHome() {
  return (
    <main className="px-3 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Side project · runs in your browser</p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Open Studio</h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          Seven creative apps, one for each tool in Adobe&apos;s core suite, inspired by ArtCraft&apos;s open-source push. Each one covers
          the everyday workflow of the app it stands in for. Everything runs on your device: no install, no account, no uploads.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_APPS.map((a) => (
            <Link
              key={a.slug}
              href={`/projects/studio/${a.slug}`}
              className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">{a.name}</h2>
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

        <section className="mt-12 grid gap-6 rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-white">Private by design</h3>
            <p className="mt-1">Images, video and PDFs are processed in this tab using canvas, Web Audio and plain JavaScript. Nothing is sent to a server.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Honest scope</h3>
            <p className="mt-1">These are the everyday 80% of each app, not a pro replacement. There are no RAW files, CMYK, masks, plugins or cloud sync.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Open formats out</h3>
            <p className="mt-1">Export PNG, JPG, SVG, WebM and real PDFs. Work isn&apos;t saved between visits, so export before you close the tab.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
