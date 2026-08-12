import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTeardown, getTeardowns } from "@/content/teardowns";

export function generateStaticParams() {
  return getTeardowns().map((teardown) => ({ slug: teardown.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teardown = getTeardown(slug);

  if (!teardown) return { title: "Teardown | Product Shots" };

  return {
    title: `${teardown.company} | Product Shots`,
    description: teardown.dek,
  };
}

export default async function TeardownPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teardown = getTeardown(slug);

  if (!teardown) notFound();

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:pt-16">
        <Link
          href="/productshot/teardowns"
          className="text-sm text-accent hover:underline"
        >
          ← Back to teardowns
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent">
          {teardown.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
          {teardown.headline}
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          {teardown.dek}
        </p>

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={teardown.image}
            alt={`${teardown.company} teardown infographic`}
            className="w-full"
          />
        </div>
      </div>
    </main>
  );
}
