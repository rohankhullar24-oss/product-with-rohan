import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getArticles } from "@/lib/articles/fetch-posts";
import type { NewsItem } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [articles, newsResult] = await Promise.all([
    getArticles(),
    supabase
      .from("news_items")
      .select("*")
      .order("published_date", { ascending: false })
      .limit(3),
  ]);

  const latestArticles = articles.slice(0, 4);
  const latestNews = (newsResult.data ?? []) as NewsItem[];

  return (
    <main className="pt-16 min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Product Shots
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Daily practice questions + PM news for your growth
          </p>
        </div>

        {/* Quick Links */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <Link
            href="/productshot/shots"
            className="flex items-center justify-between rounded-lg bg-gradient-to-br from-accent to-accent/80 p-6 text-white hover:shadow-lg transition-shadow"
          >
            <div>
              <p className="text-sm font-medium opacity-90">Shots</p>
              <p className="text-lg font-bold">All questions</p>
            </div>
            <svg
              className="h-8 w-8 opacity-50"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          <Link
            href="/productshot/articles"
            className="flex items-center justify-between rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 p-6 text-white hover:shadow-lg transition-shadow"
          >
            <div>
              <p className="text-sm font-medium opacity-90">Articles</p>
              <p className="text-lg font-bold">{latestArticles.length} pieces</p>
            </div>
            <svg
              className="h-8 w-8 opacity-50"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </Link>

          <Link
            href="/productshot/news"
            className="flex items-center justify-between rounded-lg bg-gradient-to-br from-purple-400 to-purple-500 p-6 text-white hover:shadow-lg transition-shadow"
          >
            <div>
              <p className="text-sm font-medium opacity-90">News</p>
              <p className="text-lg font-bold">{latestNews.length} updates</p>
            </div>
            <svg
              className="h-8 w-8 opacity-50"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            </svg>
          </Link>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Latest Articles */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Latest Articles
              </h2>
              <Link href="/productshot/articles" className="text-sm text-accent hover:underline">
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {latestArticles.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No articles yet.
                </p>
              ) : (
                latestArticles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/productshot/articles/${a.slug}`}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 hover:border-accent transition"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {a.date}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white hover:text-accent">
                      {a.title}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Latest News */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Latest News
              </h2>
              <Link href="/productshot/news" className="text-sm text-accent hover:underline">
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {latestNews.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No news yet.
                </p>
              ) : (
                latestNews.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
                  >
                    <p className="text-xs font-semibold uppercase text-accent">
                      {n.category}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {n.title}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
