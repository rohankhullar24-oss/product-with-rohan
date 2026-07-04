"use client";

import Link from "next/link";
import { useState } from "react";

type ContentCardProps = {
  title: string;
  description: string;
  date: string;
  thumbnail?: string;
  slug?: string;
  href: string;
  category?: string;
};

export function ContentCard({
  title,
  description,
  date,
  thumbnail,
  href,
  category,
}: ContentCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Link href={href}>
      <div className="flex flex-col sm:flex-row gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-shadow cursor-pointer">
        {/* Content Section */}
        <div className="flex-1">
          {category && (
            <span className="inline-block text-xs font-semibold text-accent uppercase tracking-wide">
              {category}
            </span>
          )}
          <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {description}
          </p>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {date}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsSaved(!isSaved);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <svg
                  className={`h-5 w-5 ${
                    isSaved
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
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigator.share?.({
                    title,
                    text: description,
                    url: window.location.href,
                  });
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <svg
                  className="h-5 w-5 text-slate-400 dark:text-slate-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M15 8a1 1 0 11-2 0 1 1 0 012 0z" />
                  <path
                    fillRule="evenodd"
                    d="M4.318 6.318a4 4 0 015.364 0L12 7.293l2.318-2.319a4 4 0 11 5.656 5.656l-2.318 2.319 2.318 2.319a4 4 0 11-5.656 5.656l-2.318-2.319-2.318 2.319a4 4 0 01-5.656-5.656l2.318-2.319-2.318-2.319a4 4 0 015.364-5.364z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <svg
                className="h-5 w-5 text-slate-400 dark:text-slate-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Thumbnail */}
        {thumbnail && (
          <div className="flex-shrink-0 w-full sm:w-40 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
