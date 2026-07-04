"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

type Bookmark = {
  id: string;
  content_id: string;
};

type Props = {
  articles: Article[];
};

export default function ArticlesClient({ articles }: Props) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchBookmarks = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("bookmarks")
        .select("content_id")
        .eq("content_type", "article")
        .eq("user_email", userEmail);

      const bookmarkIds = new Set(
        (data as Bookmark[] | null)?.map((b) => b.content_id) ?? []
      );
      setBookmarks(bookmarkIds);
      setLoading(false);
    };

    fetchBookmarks();
  }, [supabase]);

  const toggleBookmark = async (article: Article) => {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) return;

    const isBookmarked = bookmarks.has(article.slug);

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("content_id", article.slug)
        .eq("content_type", "article")
        .eq("user_email", userEmail);

      setBookmarks((prev) => {
        const next = new Set(prev);
        next.delete(article.slug);
        return next;
      });
    } else {
      await supabase.from("bookmarks").insert({
        user_email: userEmail,
        content_type: "article",
        content_id: article.slug,
        content_title: article.title,
      });

      setBookmarks((prev) => new Set([...prev, article.slug]));
    }
  };

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6 mb-8">
      {articles.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">
          No articles available yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/${article.slug}`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 hover:border-accent transition block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                    {article.date}
                  </p>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {article.description}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleBookmark(article);
                  }}
                  className="flex-shrink-0 p-2"
                >
                  <svg
                    className={`h-5 w-5 transition ${
                      bookmarks.has(article.slug)
                        ? "fill-accent text-accent"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
