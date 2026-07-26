import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticles } from "@/lib/articles/fetch-posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const [shotResult, newsResult, articles] = await Promise.all([
    supabase
      .from("shots_questions")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("news_items")
      .select("id, published_date")
      .order("published_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getArticles(),
  ]);

  const latestArticle = articles[0] ?? null;

  return NextResponse.json({
    shot: shotResult.data ? { id: shotResult.data.id, at: shotResult.data.created_at } : null,
    news: newsResult.data ? { id: newsResult.data.id, at: newsResult.data.published_date } : null,
    article: latestArticle ? { id: latestArticle.slug, at: latestArticle.date } : null,
  });
}
