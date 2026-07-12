import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Unavailable | Rohan Khullar",
  description: "This page is temporarily unavailable.",
  robots: { index: false, follow: true },
};

export default function HandbookPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          UNAVAILABLE
        </h1>
        <Link href="/" className="mt-8 inline-block text-sm text-accent hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
