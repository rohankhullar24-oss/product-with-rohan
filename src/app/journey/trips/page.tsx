"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTrips } from "@/lib/journey/itinerary";
import type { ItineraryTrip } from "@/lib/journey/types";

export default function TripsPage() {
  const [trips, setTrips] = useState<ItineraryTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrips()
      .then(setTrips)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load trips."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy dark:text-foreground">Trips</h1>
        <Link
          href="/journey/trips/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + New trip
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading...</p>
      ) : trips.length === 0 ? (
        <p className="mt-6 text-sm text-slate">No trips planned yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
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
    </div>
  );
}
