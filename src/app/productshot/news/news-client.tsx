"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NewsItem } from "@/types/database";

type Bookmark = {
  id: string;
  content_id: string;
};

type Props = {
  items: NewsItem[];
};

export default function NewsClient({ items }: Props) {
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
        .eq("content_type", "news")
        .eq("user_email", userEmail);

      const bookmarkIds = new Set(
        (data as Bookmark[] | null)?.map((b) => b.content_id) ?? []
      );
      setBookmarks(bookmarkIds);
      setLoading(false);
    };

    fetchBookmarks();
  }, [supabase]);

  const toggleBookmark = async (item: NewsItem) => {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) return;

    const isBookmarked = bookmarks.has(item.id);

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("content_id", item.id)
        .eq("content_type", "news")
        .eq("user_email", userEmail);

      setBookmarks((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } else {
      await supabase.from("bookmarks").insert({
        user_email: userEmail,
        content_type: "news",
        content_id: item.id,
        content_title: item.title,
      });

      setBookmarks((prev) => new Set([...prev, item.id]));
    }
  };

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6 mb-8">
      {items.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">
          No news available yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase text-accent">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      {new Date(item.published_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {item.summary}
                  </p>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline mt-2 inline-block"
                    >
                      Read source →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => toggleBookmark(item)}
                  className="flex-shrink-0 p-2"
                >
                  <svg
                    className={`h-5 w-5 transition ${
                      bookmarks.has(item.id)
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
