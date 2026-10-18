import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "./rows";
import type { Reminder, ReminderType } from "./types";

// Reads/writes the `reminders` table reminder-app's SyncManager.kt syncs to
// (id uuid, user_id, payload, updated_at, deleted). The phone schedules its
// alarms from whatever it merges on its next sync, so a web edit rings on
// the phone once the app has synced (it syncs on open).
//
// Schedule logic below mirrors Reminder.kt's occursOn/nextTrigger.

export const NAG_OPTIONS = [0, 10, 15, 30, 60, 120];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Local-time ISO date. Reminders are wall-clock, so never use UTC here. */
export function localISODate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** 1=Mon .. 7=Sun, like java.time's DayOfWeek.value. */
function isoWeekday(d: Date) {
  return d.getDay() === 0 ? 7 : d.getDay();
}

export function createDraftReminder(overrides: Partial<Reminder> = {}): Reminder {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    title: "",
    notes: "",
    type: "ONE_TIME",
    oneTimeDate: localISODate(now),
    daysOfWeek: [],
    dayOfMonth: now.getDate(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    timesOfDay: [`${String(Math.min(23, now.getHours() + 1)).padStart(2, "0")}:00`],
    nagIntervalMinutes: 30,
    enabled: true,
    completed: false,
    doneForDay: null,
    activeNagDay: null,
    alarmStyle: true,
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function occursOn(r: Reminder, d: Date): boolean {
  switch (r.type) {
    case "ONE_TIME":
      return localISODate(d) === r.oneTimeDate;
    case "DAILY":
      return true;
    case "WEEKLY":
      return r.daysOfWeek.includes(isoWeekday(d));
    case "MONTHLY":
      return d.getDate() === Math.min(r.dayOfMonth, daysInMonth(d));
    case "YEARLY":
      return d.getMonth() + 1 === r.month && d.getDate() === Math.min(r.day, daysInMonth(d));
  }
}

/** Next slot strictly after `now`, skipping a day already confirmed Done. */
export function nextTrigger(r: Reminder, now: Date = new Date()): Date | null {
  if (!r.enabled || r.completed || r.timesOfDay.length === 0) return null;
  const sorted = [...r.timesOfDay].sort();
  // 800 days covers every recurrence gap, as in Reminder.kt.
  for (let offset = 0; offset <= 800; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!occursOn(r, d)) continue;
    if (r.doneForDay === localISODate(d)) continue;
    for (const t of sorted) {
      const [h, m] = t.split(":").map(Number);
      const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
      if (dt > now) return dt;
    }
  }
  return null;
}

export function scheduleLabel(r: Reminder): string {
  let typeLabel: string;
  switch (r.type) {
    case "ONE_TIME":
      typeLabel = r.oneTimeDate
        ? parseISODate(r.oneTimeDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
        : "One time";
      break;
    case "DAILY":
      typeLabel = "Every day";
      break;
    case "WEEKLY":
      typeLabel = "Every " + [...r.daysOfWeek].sort().map((d) => WEEKDAYS[d - 1]).join(", ");
      break;
    case "MONTHLY":
      typeLabel = `Monthly on day ${r.dayOfMonth}`;
      break;
    case "YEARLY":
      typeLabel = `Every year on ${r.day} ${MONTHS[r.month - 1]}`;
      break;
  }
  const times = [...r.timesOfDay].sort();
  return `${typeLabel} · ${times.length === 1 ? `at ${times[0]}` : `${times.length}×/day (${times.join(", ")})`}`;
}

export const TYPE_LABELS: Record<ReminderType, string> = {
  ONE_TIME: "Once",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/** Returns an error message, or null when the reminder can be saved. */
export function validate(r: Reminder): string | null {
  if (!r.title.trim()) return "Give the reminder a title.";
  if (r.timesOfDay.length === 0) return "Add at least one time.";
  if (r.type === "ONE_TIME" && !r.oneTimeDate) return "Pick a date.";
  if (r.type === "WEEKLY" && r.daysOfWeek.length === 0) return "Pick at least one weekday.";
  // Editing resurrects a finished reminder (EditReminderActivity does the same).
  if (!nextTrigger({ ...r, completed: false, doneForDay: null, enabled: true })) return "That time has already passed.";
  return null;
}

export async function listReminders(): Promise<Reminder[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("reminders").select("payload").eq("deleted", false);
  if (error) throw error;
  return (data ?? []).map((row) => row.payload as Reminder);
}

async function upsert(r: Reminder): Promise<Reminder> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const stamped = { ...r, updatedAt: Date.now() };
  const { error } = await supabase
    .from("reminders")
    .upsert({ id: stamped.id, user_id: userId, payload: stamped, updated_at: stamped.updatedAt, deleted: false });
  if (error) throw error;
  return stamped;
}

/** Saving from the editor resets done/nag state, matching EditReminderActivity. */
export function saveReminder(r: Reminder): Promise<Reminder> {
  return upsert({ ...r, completed: false, doneForDay: null, activeNagDay: null, enabled: true });
}

export function setEnabled(r: Reminder, enabled: boolean): Promise<Reminder> {
  return upsert({ ...r, enabled });
}

/**
 * Mirrors NotificationActionReceiver's Done: a one-time reminder finishes;
 * a recurring one is silenced for the rest of that occurrence day.
 */
export function markDone(r: Reminder, occurrenceDay: string = localISODate()): Promise<Reminder> {
  const base = { ...r, activeNagDay: null };
  return upsert(r.type === "ONE_TIME" ? { ...base, completed: true } : { ...base, doneForDay: occurrenceDay });
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase
    .from("reminders")
    .upsert({ id, user_id: userId, payload: {}, updated_at: Date.now(), deleted: true });
  if (error) throw error;
}
