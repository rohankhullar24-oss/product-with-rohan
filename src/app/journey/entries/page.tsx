"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEntries } from "@/lib/journey/journal";
import type { JournalEntry } from "@/lib/journey/types";

export default function EntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntries()
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load entries."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy dark:text-foreground">Journal</h1>
        <Link
          href="/journey/entries/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + New entry
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="mt-6 text-sm text-slate">No journal entries yet — write your first one.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/journey/entries/${entry.id}`}
                className="block rounded-lg border border-slate/15 px-4 py-3 hover:border-accent"
              >
                <div className="flex items-center justify-between text-xs text-slate">
                  <span>{entry.entryDate}</span>
                  {entry.placeName && <span>{entry.placeName}</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-navy dark:text-foreground">
                  {entry.text || <span className="italic text-slate">Empty entry</span>}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
