"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftTrip, saveTrip } from "@/lib/journey/itinerary";

export default function NewTripPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const trip = createDraftTrip({ name, startDate, endDate, notes });
      await saveTrip(trip);
      router.push(`/journey/trips/${trip.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save trip.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-navy dark:text-foreground">New trip</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate">
          Trip name
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa with friends"
            className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="rounded-lg border border-slate/25 px-4 py-3 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
