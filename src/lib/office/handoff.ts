// Passes an opened file between studio apps without a round trip through
// the file picker (e.g. Viewer → "Edit text" → Docs). In-memory only: it
// lives as long as the tab and is read once.

let pending: { app: string; file: File } | null = null;

export function handOff(app: string, file: File) {
  pending = { app, file };
}

export function takeHandOff(app: string): File | null {
  if (pending?.app !== app) return null;
  const f = pending.file;
  pending = null;
  return f;
}
