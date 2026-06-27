import Link from "next/link";
import { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const url = `https://productwithrohan.online/blogs/${slug}`;

  return {
    title: `${post.title} | Rohan Khullar`,
    description: post.description,
    keywords: ["blog", "product management", "AI", "technology"],
    authors: [{ name: "Rohan Khullar" }],
    openGraph: {
      type: "article",
      url: url,
      title: post.title,
      description: post.description,
      siteName: "Product with Rohan",
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return (
    <main className="flex-1 px-6 py-16 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link href="/blogs" className="text-sm text-accent hover:underline">
          ← Back to blogs
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent">
          {post.date}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-slate">{post.description}</p>

        <div className="mt-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (props) => <h1 className="mt-8 text-2xl font-semibold text-navy" {...props} />,
              h2: (props) => <h2 className="mt-8 text-xl font-semibold text-navy" {...props} />,
              h3: (props) => <h3 className="mt-6 text-lg font-semibold text-navy" {...props} />,
              p: (props) => <p className="mt-4 leading-relaxed text-slate" {...props} />,
              ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-6 text-slate" {...props} />,
              ol: (props) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate" {...props} />,
              li: (props) => <li className="leading-relaxed" {...props} />,
              a: (props) => (
                <a className="text-accent underline hover:no-underline" target="_blank" rel="noopener noreferrer" {...props} />
              ),
              strong: (props) => <strong className="font-semibold text-navy" {...props} />,
              table: (props) => (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-sm" {...props} />
                </div>
              ),
              th: (props) => (
                <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-navy" {...props} />
              ),
              td: (props) => <td className="border-b border-slate-100 px-3 py-2 text-slate" {...props} />,
              hr: () => <hr className="my-8 border-slate-200" />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
