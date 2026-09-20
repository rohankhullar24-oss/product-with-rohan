import { createClient } from "@/lib/supabase/client";
import type { ItineraryStop, ItineraryTrip } from "./types";

// Reads/writes the same generic `auto_scheduler_rows` table reminder-app's
// ItinerarySyncManager.kt/RowSyncEngine.kt already sync trips and stops to
// (kind "itinerary_trip" / "itinerary_stop", conflict key user_id+kind+id) —
// this is a second client of that data, not a separate store.

const KIND_TRIP = "itinerary_trip";
const KIND_STOP = "itinerary_stop";
const ON_CONFLICT = "user_id,kind,id";

async function currentUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export function createDraftTrip(overrides: Partial<ItineraryTrip> = {}): ItineraryTrip {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    name: "",
    startDate: today,
    endDate: today,
    notes: "",
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createDraftStop(tripId: string, overrides: Partial<ItineraryStop> = {}): ItineraryStop {
  return {
    id: crypto.randomUUID(),
    tripId,
    date: new Date().toISOString().slice(0, 10),
    time: null,
    title: "",
    location: "",
    notes: "",
    updatedAt: Date.now(),
    ...overrides,
  };
}

export async function listTrips(): Promise<ItineraryTrip[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auto_scheduler_rows")
    .select("payload")
    .eq("kind", KIND_TRIP)
    .eq("deleted", false);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.payload as ItineraryTrip)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function getTrip(id: string): Promise<ItineraryTrip | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auto_scheduler_rows")
    .select("payload")
    .eq("kind", KIND_TRIP)
    .eq("id", id)
    .eq("deleted", false)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as ItineraryTrip | undefined) ?? null;
}

export async function saveTrip(trip: ItineraryTrip): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("auto_scheduler_rows").upsert(
    { id: trip.id, kind: KIND_TRIP, user_id: userId, payload: trip, updated_at: trip.updatedAt, deleted: false },
    { onConflict: ON_CONFLICT }
  );
  if (error) throw error;
}

/** Tombstones every stop under the trip too, mirroring EditItineraryTripActivity's delete flow. */
export async function deleteTrip(id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const now = Date.now();

  const stops = await listStopsForTrip(id);
  for (const stop of stops) {
    const { error } = await supabase.from("auto_scheduler_rows").upsert(
      { id: stop.id, kind: KIND_STOP, user_id: userId, payload: {}, updated_at: now, deleted: true },
      { onConflict: ON_CONFLICT }
    );
    if (error) throw error;
  }

  const { error } = await supabase.from("auto_scheduler_rows").upsert(
    { id, kind: KIND_TRIP, user_id: userId, payload: {}, updated_at: now, deleted: true },
    { onConflict: ON_CONFLICT }
  );
  if (error) throw error;
}

export async function listStopsForTrip(tripId: string): Promise<ItineraryStop[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auto_scheduler_rows")
    .select("payload")
    .eq("kind", KIND_STOP)
    .eq("deleted", false);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.payload as ItineraryStop)
    .filter((stop) => stop.tripId === tripId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if ((a.time == null) !== (b.time == null)) return a.time == null ? 1 : -1;
      if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
      return a.title.localeCompare(b.title);
    });
}

export async function saveStop(stop: ItineraryStop): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("auto_scheduler_rows").upsert(
    { id: stop.id, kind: KIND_STOP, user_id: userId, payload: stop, updated_at: stop.updatedAt, deleted: false },
    { onConflict: ON_CONFLICT }
  );
  if (error) throw error;
}

export async function deleteStop(id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("auto_scheduler_rows").upsert(
    { id, kind: KIND_STOP, user_id: userId, payload: {}, updated_at: Date.now(), deleted: true },
    { onConflict: ON_CONFLICT }
  );
  if (error) throw error;
}
