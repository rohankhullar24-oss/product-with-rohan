"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  createDraftStop,
  deleteStop,
  deleteTrip,
  getTrip,
  listStopsForTrip,
  saveStop,
  saveTrip,
} from "@/lib/journey/itinerary";
import type { ItineraryStop, ItineraryTrip } from "@/lib/journey/types";

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<ItineraryTrip | null>(null);
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddStop, setShowAddStop] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  async function refresh() {
    const [foundTrip, foundStops] = await Promise.all([getTrip(tripId), listStopsForTrip(tripId)]);
    if (!foundTrip) {
      setNotFound(true);
    } else {
      setTrip(foundTrip);
      setStops(foundStops);
      setDraftDate(foundTrip.startDate);
    }
  }

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load trip."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!trip) return;
    try {
      const updated = { ...trip, updatedAt: Date.now() };
      await saveTrip(updated);
      setTrip(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save trip.");
    }
  }

  async function handleDeleteTrip() {
    if (!trip || !confirm("Delete this trip and all its stops?")) return;
    try {
      await deleteTrip(trip.id);
      router.push("/journey/trips");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete trip.");
    }
  }

  async function handleAddStop(e: React.FormEvent) {
    e.preventDefault();
    try {
      const stop = createDraftStop(tripId, {
        date: draftDate,
        time: draftTime.trim() ? draftTime.trim() : null,
        title: draftTitle,
        location: draftLocation,
        notes: draftNotes,
      });
      await saveStop(stop);
      setStops((prev) => [...prev, stop]);
      setDraftTime("");
      setDraftTitle("");
      setDraftLocation("");
      setDraftNotes("");
      setShowAddStop(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add stop.");
    }
  }

  async function handleDeleteStop(id: string) {
    if (!confirm("Delete this stop?")) return;
    try {
      await deleteStop(id);
      setStops((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete stop.");
    }
  }

  if (loading) return <p className="p-8 text-sm text-slate">Loading...</p>;
  if (notFound) return <p className="p-8 text-sm text-slate">Trip not found.</p>;
  if (!trip) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSaveTrip} className="flex flex-col gap-4 rounded-xl border border-slate/15 p-5">
        <input
          type="text"
          value={trip.name}
          onChange={(e) => setTrip({ ...trip, name: e.target.value })}
          placeholder="Trip name"
          className="text-xl font-bold text-navy outline-none focus:border-accent dark:text-foreground"
        />
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate">
            Start date
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
              className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate">
            End date
            <input
              type="date"
              value={trip.endDate}
              onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
              className="rounded-lg border border-slate/25 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
          </label>
        </div>
        <textarea
          value={trip.notes}
          onChange={(e) => setTrip({ ...trip, notes: e.target.value })}
          placeholder="Notes"
          rows={3}
          className="rounded-lg border border-slate/25 px-4 py-3 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleDeleteTrip}
            className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete trip
          </button>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy dark:text-foreground">Stops</h2>
        <button
          onClick={() => setShowAddStop((v) => !v)}
          className="text-sm font-medium text-accent hover:underline"
        >
          {showAddStop ? "Cancel" : "+ Add stop"}
        </button>
      </div>

      {showAddStop && (
        <form onSubmit={handleAddStop} className="mt-4 flex flex-col gap-3 rounded-lg border border-slate/15 p-4">
          <div className="flex gap-3">
            <input
              type="date"
              required
              value={draftDate}
              min={trip.startDate}
              max={trip.endDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate/25 px-3 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              className="rounded-lg border border-slate/25 px-3 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
          </div>
          <input
            type="text"
            required
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="What's happening?"
            className="rounded-lg border border-slate/25 px-3 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
          <input
            type="text"
            value={draftLocation}
            onChange={(e) => setDraftLocation(e.target.value)}
            placeholder="Location (optional)"
            className="rounded-lg border border-slate/25 px-3 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
          <textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="rounded-lg border border-slate/25 px-3 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add stop
          </button>
        </form>
      )}

      {stops.length === 0 ? (
        <p className="mt-4 text-sm text-slate">No stops planned yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {stops.map((stop) => (
            <li key={stop.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate/15 px-4 py-3">
              <div>
                <div className="text-xs text-slate">
                  {stop.date}
                  {stop.time ? ` · ${stop.time}` : ""}
                </div>
                <div className="text-sm font-medium text-navy dark:text-foreground">{stop.title}</div>
                {stop.location && <div className="text-xs text-slate">{stop.location}</div>}
                {stop.notes && <div className="mt-1 text-xs text-slate">{stop.notes}</div>}
              </div>
              <button
                onClick={() => handleDeleteStop(stop.id)}
                className="flex-shrink-0 text-xs text-slate underline-offset-2 hover:text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
