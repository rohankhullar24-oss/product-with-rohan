import { NextResponse } from "next/server";
import { getArticles } from "@/lib/articles/fetch-posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await getArticles();
  const latestArticle = articles[0] ?? null;

  return NextResponse.json({
    article: latestArticle ? { id: latestArticle.slug, at: latestArticle.date } : null,
  });
}
