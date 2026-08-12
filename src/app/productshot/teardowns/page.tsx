import Link from "next/link";
import { getTeardowns } from "@/content/teardowns";

export const metadata = {
  title: "Teardowns | Product Shots",
};

export default function TeardownsPage() {
  const teardowns = getTeardowns();

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:pt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Teardowns
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Company teardowns from a PM lens — the reframe, the moat, the
            threat, and the metrics I would want before funding the roadmap.
          </p>
        </div>

        {/* Teardowns Grid */}
        {teardowns.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No teardowns available right now — check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 mb-8">
            {teardowns.map((teardown) => (
              <Link
                key={teardown.slug}
                href={`/productshot/teardowns/${teardown.slug}`}
                className="group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={teardown.image}
                    alt={`${teardown.company} teardown infographic`}
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-4 md:p-5">
                  <span className="text-xs font-semibold uppercase text-accent">
                    {teardown.company}
                  </span>
                  <h2 className="mt-1 font-bold text-slate-900 dark:text-white md:text-lg">
                    {teardown.headline}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {teardown.dek}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
