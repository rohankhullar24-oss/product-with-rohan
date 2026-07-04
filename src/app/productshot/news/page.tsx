import { createClient } from "@/lib/supabase/server";
import type { NewsItem } from "@/types/database";
import NewsClient from "./news-client";

export const revalidate = 3600;

export default async function NewsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_items")
    .select("*")
    .order("published_date", { ascending: false })
    .limit(100);

  const items = (data ?? []) as NewsItem[];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:pt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            News
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            PM-relevant news from AI, corporate, and hiring
          </p>
        </div>

        {/* News List */}
        {items.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No news yet — check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-4 mb-8">
            <NewsClient items={items} />
          </div>
        )}
      </div>
    </main>
  );
}
