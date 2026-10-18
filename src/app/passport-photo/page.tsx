import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PassportPhoto from "./PassportPhoto";
import { PASSPORT_PHOTO_PRICE_INR } from "@/lib/passport-photo/presets";

const description = `Upload a selfie, get a passport photo: AI white background, optional suit, exact 35 × 45 mm crop, under 50 KB, plus a 6 × 4 in print sheet. ₹${PASSPORT_PHOTO_PRICE_INR} per photo.`;

export const metadata: Metadata = {
  title: "AI Passport Photo Maker (India) | Rohan Khullar",
  description,
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/passport-photo",
    title: "AI Passport Photo Maker (India)",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function PassportPhotoPage() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-slate-500 hover:text-teal-600 dark:text-slate-400">
          ← productwithrohan
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">AI Passport Photo Maker</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">{description}</p>
        <PassportPhoto />
        <section className="mt-12 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">How it works</h2>
          <p>
            Your selfie goes to an AI image model that swaps the background for plain white and, if you
            ask, dresses you in formal wear. You line the head up inside the guide, pay once, and get the
            upload-ready JPEG (exact pixels, 300 DPI, compressed under the size limit) and a print sheet
            any photo shop or cyber cafe can print on 6 × 4 in paper.
          </p>
          <p>
            Nothing is stored. The edited photo is sealed and handed back to your browser, and it expires
            after 24 hours.
          </p>
          <p>
            Passport offices want a true likeness. For a passport application, &quot;Keep my clothes&quot; is
            the safest choice; the attire options suit job, exam and ID forms. Check the latest rules of
            the office you are applying to.
          </p>
        </section>
      </div>
    </main>
  );
}
