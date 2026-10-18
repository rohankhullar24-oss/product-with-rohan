import { createClient } from "@/lib/supabase/client";

// Generic access to the shared `auto_scheduler_rows` table that
// reminder-app's RowSyncEngine.kt syncs every "kind" through (conflict key
// user_id+kind+id, last-write-wins by updated_at, deletes as tombstones).
// itinerary.ts predates this and keeps its own copy of the same calls.

const TABLE = "auto_scheduler_rows";
const ON_CONFLICT = "user_id,kind,id";

type Row<T> = T & { id: string; updatedAt: number };

export async function currentUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function listRows<T>(kind: string): Promise<Row<T>[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE).select("payload").eq("kind", kind).eq("deleted", false);
  if (error) throw error;
  return (data ?? []).map((row) => row.payload as Row<T>);
}

/** Stamps updatedAt (the phone's merge compares it) and upserts the row. */
export async function saveRow<T>(kind: string, item: Row<T>): Promise<Row<T>> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const stamped = { ...item, updatedAt: Date.now() };
  const { error } = await supabase.from(TABLE).upsert(
    { id: stamped.id, kind, user_id: userId, payload: stamped, updated_at: stamped.updatedAt, deleted: false },
    { onConflict: ON_CONFLICT }
  );
  if (error) throw error;
  return stamped;
}

export async function deleteRow(kind: string, id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from(TABLE).upsert(
    { id, kind, user_id: userId, payload: {}, updated_at: Date.now(), deleted: true },
    { onConflict: ON_CONFLICT }
  );
  if (error) throw error;
}
