"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEntries } from "@/lib/journey/journal";
import { listTrips } from "@/lib/journey/itinerary";
import { listReminders, localISODate, occursOn } from "@/lib/journey/reminders";
import type { ItineraryTrip, JournalEntry, Reminder } from "@/lib/journey/types";
import { ErrorNote, PageHeader, ghostBtn } from "@/components/journey/ui";

// One month view across Journal (by entryDate, like JournalCalendarActivity),
// trips (by their date range) and reminder occurrences.

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - lead + i));
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trips, setTrips] = useState<ItineraryTrip[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState(() => localISODate());

  useEffect(() => {
    Promise.allSettled([listEntries(), listTrips(), listReminders()]).then(([e, t, r]) => {
      if (e.status === "fulfilled") setEntries(e.value);
      if (t.status === "fulfilled") setTrips(t.value);
      if (r.status === "fulfilled") setReminders(r.value);
      if ([e, t, r].some((x) => x.status === "rejected")) setError("Some of your calendar couldn't load. Try refreshing.");
    });
  }, []);

  const today = localISODate();
  const days = monthGrid(cursor.year, cursor.month);
  const activeReminders = reminders.filter((r) => r.enabled && !r.completed);

  const entriesOn = (iso: string) => entries.filter((e) => e.entryDate === iso);
  const tripsOn = (iso: string) => trips.filter((t) => t.startDate <= iso && iso <= t.endDate);
  const remindersOn = (d: Date) => activeReminders.filter((r) => occursOn(r, d));

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const [sy, sm, sd] = selected.split("-").map(Number);
  const selectedDate = new Date(sy, sm - 1, sd);
  const dayEntries = entriesOn(selected);
  const dayTrips = tripsOn(selected);
  const dayReminders = remindersOn(selectedDate);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <PageHeader title="Calendar" subtitle="Journal entries, trips and reminders in one place." />
      <ErrorNote message={error} />

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy dark:text-foreground">
          {new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => shift(-1)} className={ghostBtn} aria-label="Previous month">
            ←
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setCursor({ year: now.getFullYear(), month: now.getMonth() });
              setSelected(today);
            }}
            className={ghostBtn}
          >
            Today
          </button>
          <button onClick={() => shift(1)} className={ghostBtn} aria-label="Next month">
            →
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate/15 bg-slate/15">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="bg-background py-2 text-center text-xs font-medium text-slate">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const iso = localISODate(d);
          const inMonth = d.getMonth() === cursor.month;
          const e = entriesOn(iso).length;
          const t = tripsOn(iso);
          const r = remindersOn(d).length;
          return (
            <button
              key={iso}
              onClick={() => setSelected(iso)}
              className={`flex min-h-16 flex-col items-start gap-1 bg-background p-1.5 text-left sm:min-h-20 ${selected === iso ? "ring-2 ring-inset ring-accent" : ""}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  iso === today ? "bg-accent font-semibold text-white" : inMonth ? "text-navy dark:text-foreground" : "text-slate/50"
                }`}
              >
                {d.getDate()}
              </span>
              {t.length > 0 && <span className="w-full truncate rounded bg-sky-500/20 px-1 text-[10px] text-sky-700 dark:text-sky-300">{t[0].name || "Trip"}</span>}
              <span className="flex gap-1">
                {e > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" title={`${e} journal entr${e > 1 ? "ies" : "y"}`} />}
                {r > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={`${r} reminder${r > 1 ? "s" : ""}`} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-4 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Journal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Reminder
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-sky-500/20" /> Trip
        </span>
      </p>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy dark:text-foreground">
            {selectedDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <Link href={`/journey/entries/new?date=${selected}`} className="text-sm font-medium text-accent hover:underline">
            + Journal this day
          </Link>
        </div>
        {dayEntries.length + dayTrips.length + dayReminders.length === 0 ? (
          <p className="mt-3 text-sm text-slate">Nothing on this day.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {dayTrips.map((t) => (
              <li key={t.id}>
                <Link href={`/journey/trips/${t.id}`} className="block rounded-lg border border-slate/15 px-4 py-3 hover:border-accent">
                  <div className="text-xs text-sky-600">Trip</div>
                  <div className="text-sm font-medium text-navy dark:text-foreground">{t.name || "Untitled trip"}</div>
                </Link>
              </li>
            ))}
            {dayReminders.map((r) => (
              <li key={r.id}>
                <Link href="/journey/reminders" className="block rounded-lg border border-slate/15 px-4 py-3 hover:border-accent">
                  <div className="text-xs text-amber-600">Reminder · {[...r.timesOfDay].sort().join(", ")}</div>
                  <div className={`text-sm font-medium ${r.doneForDay === selected ? "text-slate line-through" : "text-navy dark:text-foreground"}`}>{r.title}</div>
                </Link>
              </li>
            ))}
            {dayEntries.map((e) => (
              <li key={e.id}>
                <Link href={`/journey/entries/${e.id}`} className="block rounded-lg border border-slate/15 px-4 py-3 hover:border-accent">
                  <div className="text-xs text-accent">Journal</div>
                  <div className="truncate text-sm text-navy dark:text-foreground">{e.text || <span className="italic text-slate">Empty entry</span>}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
