"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEntries } from "@/lib/journey/journal";
import { listTrips } from "@/lib/journey/itinerary";
import { listReminders, localISODate, markDone, occursOn } from "@/lib/journey/reminders";
import type { JournalEntry, ItineraryTrip, Reminder } from "@/lib/journey/types";

export default function JourneyDashboard() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trips, setTrips] = useState<ItineraryTrip[]>([]);
  const [today, setToday] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [entryList, tripList] = await Promise.all([listEntries(), listTrips()]);
        setEntries(entryList.slice(0, 5));
        setTrips(tripList.filter((t) => t.endDate >= new Date().toISOString().slice(0, 10)).slice(0, 5));
        // Reminders load separately so a failure there doesn't hide the rest.
        listReminders()
          .then((rs) => setToday(rs.filter((r) => r.enabled && !r.completed && occursOn(r, new Date()))))
          .catch(() => {});
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
      <p className="mt-1 text-sm text-slate">Log your life, plan where you&apos;re headed, and keep your reminders and notes in step with your phone.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {today.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy dark:text-foreground">Today&apos;s reminders</h2>
            <Link href="/journey/reminders" className="text-sm font-medium text-accent hover:underline">
              All reminders →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {today.map((r) => {
              const done = r.doneForDay === localISODate();
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate/15 px-4 py-3">
                  <div className="min-w-0">
                    <div className={`truncate text-sm ${done ? "text-slate line-through" : "text-navy dark:text-foreground"}`}>{r.title}</div>
                    <div className="text-xs text-slate">{[...r.timesOfDay].sort().join(", ")}</div>
                  </div>
                  {done ? (
                    <span className="text-xs text-accent">Done</span>
                  ) : (
                    <button
                      onClick={async () => {
                        const updated = await markDone(r);
                        setToday((cur) => cur.map((x) => (x.id === r.id ? updated : x)));
                      }}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Done
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
