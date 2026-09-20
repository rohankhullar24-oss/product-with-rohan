// Mirrors the JSON payload shapes reminder-app's Android client already
// writes to Supabase (JournalEntry.kt, ItineraryTrip.kt, ItineraryStop.kt) —
// keep field names/casing in sync with those files, not just this one.

export interface JournalEntry {
  id: string;
  text: string;
  photoFile: string | null;
  videoFile: string | null;
  audioFile: string | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  createdAt: number;
  /** ISO date "2026-03-14" — the day this entry is about. */
  entryDate: string;
  updatedAt: number;
}

export interface ItineraryTrip {
  id: string;
  name: string;
  /** ISO date "2026-03-12" */
  startDate: string;
  endDate: string;
  notes: string;
  updatedAt: number;
}

export interface ItineraryStop {
  id: string;
  tripId: string;
  /** ISO date "2026-03-14" */
  date: string;
  /** "HH:mm", optional */
  time: string | null;
  title: string;
  location: string;
  notes: string;
  updatedAt: number;
}
