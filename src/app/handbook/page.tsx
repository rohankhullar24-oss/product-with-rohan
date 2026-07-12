import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Product Manager Handbook | Rohan Khullar",
  description: "The Product Manager Handbook is temporarily unavailable. Check back soon.",
  robots: { index: false, follow: true },
};

export default function HandbookPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          The Product Manager Handbook
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          Temporarily unavailable
        </h1>
        <p className="mt-3 text-slate dark:text-slate-400">
          The handbook isn&apos;t available for purchase right now. Check back soon.
        </p>
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
          Already bought it and need your files? Email me at{" "}
          <a href="mailto:rohankhullar24@gmail.com" className="text-accent hover:underline">
            rohankhullar24@gmail.com
          </a>{" "}
          with your payment ID.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-accent hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
