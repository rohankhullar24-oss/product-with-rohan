import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles/fetch-posts";
import { Markdown } from "@/components/Markdown";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  return {
    title: article ? `${article.title} | Product Shots` : "Article | Product Shots",
    description: article?.description,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="flex-1 px-6 py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/productshot/articles" className="text-sm text-accent hover:underline">
          ← Back to articles
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent">
          {article.date}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy dark:text-foreground sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-slate">{article.description}</p>

        <div className="mt-10">
          <Markdown content={article.content} />
        </div>
      </article>
    </main>
  );
}
