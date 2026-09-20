"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteEntry, getEntry, saveEntry } from "@/lib/journey/journal";
import type { JournalEntry } from "@/lib/journey/types";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEntry(id)
      .then((found) => (found ? setEntry(found) : setNotFound(true)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load entry."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      const updated = { ...entry, updatedAt: Date.now() };
      await saveEntry(updated);
      setEntry(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry || !confirm("Delete this entry?")) return;
    try {
      await deleteEntry(entry.id);
      router.push("/journey/entries");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete entry.");
    }
  }

  if (loading) return <p className="p-8 text-sm text-slate">Loading...</p>;
  if (notFound) return <p className="p-8 text-sm text-slate">Entry not found.</p>;
  if (!entry) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-navy dark:text-foreground">Edit entry</h1>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate">
          Date
          <input
            type="date"
            value={entry.entryDate}
            onChange={(e) => setEntry({ ...entry, entryDate: e.target.value })}
            className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate">
          Where were you? (optional)
          <input
            type="text"
            value={entry.placeName ?? ""}
            onChange={(e) => setEntry({ ...entry, placeName: e.target.value || null })}
            className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate">
          What's on your mind?
          <textarea
            value={entry.text}
            onChange={(e) => setEntry({ ...entry, text: e.target.value })}
            rows={12}
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
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
