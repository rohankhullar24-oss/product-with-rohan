import { createClient } from "@/lib/supabase/client";
import type { JournalEntry } from "./types";

// Reads/writes the same `journal_entries` table reminder-app's
// JournalSyncManager.kt syncs to (columns: id, user_id, payload, updated_at,
// deleted) — this is a second client of that data, not a separate store.

export function createDraftEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    text: "",
    photoFile: null,
    videoFile: null,
    audioFile: null,
    latitude: null,
    longitude: null,
    placeName: null,
    createdAt: now,
    entryDate: new Date().toISOString().slice(0, 10),
    updatedAt: now,
    ...overrides,
  };
}

export async function listEntries(): Promise<JournalEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("payload")
    .eq("deleted", false);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.payload as JournalEntry)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt - a.createdAt);
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("payload")
    .eq("id", id)
    .eq("deleted", false)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as JournalEntry | undefined) ?? null;
}

async function currentUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function saveEntry(entry: JournalEntry): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("journal_entries").upsert({
    id: entry.id,
    user_id: userId,
    payload: entry,
    updated_at: entry.updatedAt,
    deleted: false,
  });
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("journal_entries").upsert({
    id,
    user_id: userId,
    payload: {},
    updated_at: Date.now(),
    deleted: true,
  });
  if (error) throw error;
}
