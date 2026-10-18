// Mirrors the JSON payload shapes reminder-app's Android client already
// writes to Supabase (JournalEntry.kt, ItineraryTrip.kt, ItineraryStop.kt,
// Reminder.kt, Note.kt, Template.kt, RecipientList.kt) —
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

// Reminder.kt — synced to the dedicated `reminders` table.
export type ReminderType = "ONE_TIME" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Reminder {
  id: string;
  title: string;
  notes: string;
  type: ReminderType;
  /** ISO date, used when type == ONE_TIME */
  oneTimeDate: string | null;
  /** 1=Mon .. 7=Sun, used when type == WEEKLY */
  daysOfWeek: number[];
  /** 1..31, used when type == MONTHLY (clamped to month length) */
  dayOfMonth: number;
  /** used when type == YEARLY (day clamped, so Feb 29 works) */
  month: number;
  day: number;
  /** "HH:mm" slots on an occurrence day, at least one */
  timesOfDay: string[];
  /** 0 = never re-nag; otherwise re-notify every N minutes until Done */
  nagIntervalMinutes: number;
  enabled: boolean;
  /** ONE_TIME only: user confirmed done */
  completed: boolean;
  /** ISO date of the occurrence day last confirmed Done */
  doneForDay: string | null;
  /** ISO date currently being nagged on the phone, null when quiet */
  activeNagDay: string | null;
  /** true = full alarm on the phone; false = normal notification */
  alarmStyle: boolean;
  updatedAt: number;
}

// Note.kt — auto_scheduler_rows kind "note".
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  checklist: ChecklistItem[];
  isChecklist: boolean;
  color: string;
  pinned: boolean;
  archived: boolean;
  /** Opaque attachment names; media stays on the phone for now. */
  images: string[];
  audio: string[];
  createdAt: number;
  updatedAt: number;
}

// Template.kt — auto_scheduler_rows kind "template".
export interface MessageTemplate {
  id: string;
  name: string;
  message: string;
  updatedAt: number;
}

// RecipientList.kt — auto_scheduler_rows kind "recipient_list".
export interface RecipientEntry {
  name: string;
  phone: string;
}

export interface RecipientList {
  id: string;
  name: string;
  members: RecipientEntry[];
  updatedAt: number;
}
