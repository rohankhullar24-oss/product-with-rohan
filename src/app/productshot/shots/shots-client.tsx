"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SHOT_TYPE_LABELS, type ShotQuestion } from "@/types/database";
import { ShotReveal } from "@/components/ShotReveal";

type Bookmark = {
  id: string;
  content_id: string;
};

type Props = {
  shots: ShotQuestion[];
};

export default function ShotsClient({ shots }: Props) {
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
        .eq("content_type", "shot")
        .eq("user_email", userEmail);

      const bookmarkIds = new Set(
        (data as Bookmark[] | null)?.map((b) => b.content_id) ?? []
      );
      setBookmarks(bookmarkIds);
      setLoading(false);
    };

    fetchBookmarks();
  }, [supabase]);

  const toggleBookmark = async (shot: ShotQuestion) => {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) return;

    const isBookmarked = bookmarks.has(shot.id);

    if (isBookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("content_id", shot.id)
        .eq("content_type", "shot")
        .eq("user_email", userEmail);

      setBookmarks((prev) => {
        const next = new Set(prev);
        next.delete(shot.id);
        return next;
      });
    } else {
      await supabase.from("bookmarks").insert({
        user_email: userEmail,
        content_type: "shot",
        content_id: shot.id,
        content_title: shot.question,
      });

      setBookmarks((prev) => new Set([...prev, shot.id]));
    }
  };

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6 mb-8">
      {shots.map((shot) => (
        <div
          key={shot.id}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 md:p-6"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase text-accent">
              {SHOT_TYPE_LABELS[shot.type]}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                {new Date(shot.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <button
                onClick={() => toggleBookmark(shot)}
                className="flex-shrink-0 p-1"
              >
                <svg
                  className={`h-5 w-5 transition ${
                    bookmarks.has(shot.id)
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

          {shot.domain && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Domain: {shot.domain}
            </p>
          )}

          <h3 className="font-bold text-slate-900 dark:text-white mb-4 md:text-lg">
            {shot.question}
          </h3>

          <ShotReveal answerMarkdown={shot.answer_markdown} />
        </div>
      ))}
    </div>
  );
}
