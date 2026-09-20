"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftEntry, saveEntry } from "@/lib/journey/journal";

export default function NewEntryPage() {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const entry = createDraftEntry({
        entryDate,
        text,
        placeName: placeName.trim() ? placeName.trim() : null,
      });
      await saveEntry(entry);
      router.push(`/journey/entries/${entry.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entry.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-navy dark:text-foreground">New entry</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate">
          Date
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate">
          Where were you? (optional)
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="e.g. Goa"
            className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate">
          What's on your mind?
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            autoFocus
            className="rounded-lg border border-slate/25 px-4 py-3 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
