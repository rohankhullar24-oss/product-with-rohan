"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEntries } from "@/lib/journey/journal";
import { listTrips } from "@/lib/journey/itinerary";
import type { JournalEntry, ItineraryTrip } from "@/lib/journey/types";

export default function JourneyDashboard() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trips, setTrips] = useState<ItineraryTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [entryList, tripList] = await Promise.all([listEntries(), listTrips()]);
        setEntries(entryList.slice(0, 5));
        setTrips(tripList.filter((t) => t.endDate >= new Date().toISOString().slice(0, 10)).slice(0, 5));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong loading Journey.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="p-8 text-sm text-slate">Loading...</p>;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-navy dark:text-foreground">Journey</h1>
      <p className="mt-1 text-sm text-slate">Log your life, and plan where you're headed next.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy dark:text-foreground">Recent entries</h2>
          <Link href="/journey/entries/new" className="text-sm font-medium text-accent hover:underline">
            + New entry
          </Link>
        </div>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate">No journal entries yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/journey/entries/${entry.id}`}
                  className="block rounded-lg border border-slate/15 px-4 py-3 hover:border-accent"
                >
                  <div className="text-xs text-slate">{entry.entryDate}</div>
                  <div className="mt-1 truncate text-sm text-navy dark:text-foreground">
                    {entry.text || <span className="italic text-slate">Empty entry</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/journey/entries" className="mt-3 inline-block text-sm text-slate underline-offset-2 hover:underline">
          View all entries →
        </Link>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy dark:text-foreground">Upcoming trips</h2>
          <Link href="/journey/trips/new" className="text-sm font-medium text-accent hover:underline">
            + New trip
          </Link>
        </div>
        {trips.length === 0 ? (
          <p className="mt-3 text-sm text-slate">No upcoming trips planned.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/journey/trips/${trip.id}`}
                  className="block rounded-lg border border-slate/15 px-4 py-3 hover:border-accent"
                >
                  <div className="text-sm font-medium text-navy dark:text-foreground">{trip.name || "Untitled trip"}</div>
                  <div className="text-xs text-slate">
                    {trip.startDate} – {trip.endDate}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/journey/trips" className="mt-3 inline-block text-sm text-slate underline-offset-2 hover:underline">
          View all trips →
        </Link>
      </section>
    </div>
  );
}
