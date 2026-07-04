import Link from "next/link";
import { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Articles | Rohan Khullar | AI, Product, and Technology Insights",
  description:
    "Research and writing on AI agents, product management, and technology. Insights from a Product Manager in fintech and B2B SaaS.",
  keywords: ["articles", "product management", "AI", "technology", "fintech"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/articles",
    title: "Articles | Rohan Khullar",
    description: "Research and writing on AI agents, product management, and technology.",
  },
};

export default function ArticlesPage() {
  const posts = getAllPosts();

  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">Articles</h1>
        <p className="mt-3 text-slate dark:text-slate-400">
          Research and writing on AI agents, product management, and technology.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/articles/${post.slug}`}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 transition hover:border-accent dark:hover:border-accent"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {post.date}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-navy dark:text-white">{post.title}</h2>
              <p className="mt-2 text-sm text-slate dark:text-slate-400">{post.description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-accent">
                Read more →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
