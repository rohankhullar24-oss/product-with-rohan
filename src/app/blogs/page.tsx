import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Blogs | Rohan Khullar",
  description: "Research and writing on AI agents, product management, and technology.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="flex-1 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-navy sm:text-4xl">Blogs</h1>
        <p className="mt-3 text-slate">
          Research and writing on AI agents, product management, and technology.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blogs/${post.slug}`}
              className="rounded-xl border border-slate-200 p-6 transition hover:border-accent"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {post.date}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-navy">{post.title}</h2>
              <p className="mt-2 text-sm text-slate">{post.description}</p>
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
