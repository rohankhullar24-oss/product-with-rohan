"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type BookmarkedItem = {
  id: string;
  content_type: "article" | "news";
  content_id: string;
  content_title: string;
  created_at: string;
};

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchBookmarks = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false });

      setBookmarks((data ?? []) as BookmarkedItem[]);
      setLoading(false);
    };

    fetchBookmarks();
  }, [supabase]);

  const removeBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading...</p>;
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      {/* Desktop View */}
      <div className="hidden md:block pt-16">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Bookmarks
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Your saved articles and news
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Log in to bookmark your favorite articles and shots.
              </p>
              <Link
                href="/productshot/login"
                className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            </div>
          ) : bookmarks.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              No bookmarks yet. Save articles and news to see them here.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-semibold uppercase text-accent mb-1 inline-block">
                        {bookmark.content_type === "article"
                          ? "Article"
                          : "News"}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {bookmark.content_type === "article" ? (
                          <Link
                            href={`/articles/${bookmark.content_id}`}
                            className="hover:text-accent transition"
                          >
                            {bookmark.content_title}
                          </Link>
                        ) : (
                          bookmark.content_title
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        Saved{" "}
                        {new Date(bookmark.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeBookmark(bookmark.id)}
                      className="flex-shrink-0 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                    >
                      <svg
                        className="h-5 w-5 text-slate-600 dark:text-slate-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
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
      </div>

      {/* Mobile View */}
      <div className="md:hidden px-4 py-4">
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Bookmarks
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your saved articles and news
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Log in to bookmark your favorite articles and shots.
              </p>
              <Link
                href="/productshot/login"
                className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400">
                No bookmarks yet. Save articles and news to see them here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-semibold uppercase text-accent mb-1 inline-block">
                        {bookmark.content_type === "article"
                          ? "Article"
                          : "News"}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {bookmark.content_type === "article" ? (
                          <Link
                            href={`/articles/${bookmark.content_id}`}
                            className="hover:text-accent transition"
                          >
                            {bookmark.content_title}
                          </Link>
                        ) : (
                          bookmark.content_title
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        Saved{" "}
                        {new Date(bookmark.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeBookmark(bookmark.id)}
                      className="flex-shrink-0 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                    >
                      <svg
                        className="h-5 w-5 text-slate-600 dark:text-slate-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
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
      </div>
    </main>
  );
}
