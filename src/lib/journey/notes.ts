import { deleteRow, listRows, saveRow } from "./rows";
import type { Note } from "./types";

// Notes sync as auto_scheduler_rows kind "note" (NotesSyncManager.kt).
// Image/audio attachments live in the encrypted notes-media bucket and are
// phone-only for now: the web keeps their names untouched so saving a note
// here never drops them.

const KIND = "note";

/** Note.PALETTE keys with NoteColors.kt's light/dark values. */
export const NOTE_COLORS: Record<string, { light: string; dark: string }> = {
  default: { light: "transparent", dark: "transparent" },
  red: { light: "#FAAFA8", dark: "#5C2B29" },
  orange: { light: "#F39F76", dark: "#594A42" },
  yellow: { light: "#FFF8B8", dark: "#635D19" },
  green: { light: "#E2F6D3", dark: "#345920" },
  teal: { light: "#B4DDD3", dark: "#16504B" },
  blue: { light: "#D4E4ED", dark: "#2D555E" },
  dark_blue: { light: "#AECBFA", dark: "#1E3A5F" },
  purple: { light: "#D3BFDB", dark: "#42275E" },
  pink: { light: "#F6E2DD", dark: "#5B2245" },
  brown: { light: "#E9E3D4", dark: "#442F19" },
  gray: { light: "#EFEFF1", dark: "#3C3F43" },
};

export function createDraftNote(overrides: Partial<Note> = {}): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    checklist: [],
    isChecklist: false,
    color: "default",
    pinned: false,
    archived: false,
    images: [],
    audio: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function isEmptyNote(n: Note) {
  return !n.title.trim() && !n.body.trim() && n.checklist.length === 0 && n.images.length === 0 && n.audio.length === 0;
}

export async function listNotes(): Promise<Note[]> {
  const notes = await listRows<Note>(KIND);
  return notes
    .map((n) => ({ ...createDraftNote(), ...n }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export const saveNote = (n: Note) => saveRow<Note>(KIND, n);
export const deleteNote = (id: string) => deleteRow(KIND, id);
