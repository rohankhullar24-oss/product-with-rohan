import { getArticles } from "@/lib/articles/fetch-posts";
import ArticlesClient from "./articles-client";

export const metadata = {
  title: "Articles | Product Shots",
};

export const revalidate = 3600;

export default async function ArticlesPage() {
  const articles = await getArticles().catch(() => []);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:pt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Articles
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Weekly PM essays and insights
          </p>
        </div>

        {/* Articles List */}
        {articles.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No articles available right now — check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-4 mb-8">
            <ArticlesClient articles={articles} />
          </div>
        )}
      </div>
    </main>
  );
}
