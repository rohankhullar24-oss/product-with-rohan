"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { NOTE_COLORS, createDraftNote, deleteNote, isEmptyNote, listNotes, saveNote } from "@/lib/journey/notes";
import type { ChecklistItem, Note } from "@/lib/journey/types";
import { ErrorNote, Modal, PageHeader, ghostBtn } from "@/components/journey/ui";

// A Keep-style board over the phone's Notes. Like NoteEditActivity there's
// no Save button: closing the editor saves, and a new note left empty is
// discarded.

function colorStyle(color: string): CSSProperties {
  const c = NOTE_COLORS[color] ?? NOTE_COLORS.default;
  return { "--note-light": c.light, "--note-dark": c.dark } as CSSProperties;
}
const colorCls = "bg-[var(--note-light)] dark:bg-[var(--note-dark)]";

function matches(n: Note, q: string) {
  if (!q) return true;
  const hay = [n.title, n.body, ...n.checklist.map((i) => i.text)].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const load = useCallback(() => {
    listNotes()
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load notes."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function persist(n: Note) {
    setError(null);
    // Optimistic: the board updates now, the save confirms in the background.
    setNotes((cur) => {
      const rest = cur.filter((x) => x.id !== n.id);
      return [{ ...n, updatedAt: Date.now() }, ...rest].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
    });
    try {
      await saveNote(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that note.");
      load();
    }
  }

  async function remove(id: string) {
    setNotes((cur) => cur.filter((x) => x.id !== id));
    try {
      await deleteNote(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete that note.");
      load();
    }
  }

  const visible = notes.filter((n) => n.archived === showArchive && matches(n, query));
  const pinned = visible.filter((n) => n.pinned && !showArchive);
  const others = visible.filter((n) => !n.pinned || showArchive);

  const grid = (list: Note[]) => (
    <div className="mt-3 columns-1 gap-3 sm:columns-2 md:columns-3">
      {list.map((n) => (
        <NoteCard
          key={n.id}
          note={n}
          onOpen={() => setEditing(n)}
          onToggleItem={(itemId) =>
            persist({ ...n, checklist: n.checklist.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) })
          }
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <PageHeader title="Notes" subtitle="The same notes as the Notes section of the Reminders app." />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes"
          className="min-w-0 flex-1 rounded-full border border-slate/25 bg-transparent px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
        />
        <button onClick={() => setShowArchive((v) => !v)} className={ghostBtn}>
          {showArchive ? "Back to notes" : "Archive"}
        </button>
      </div>

      {!showArchive && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setEditing(createDraftNote())}
            className="flex-1 rounded-xl border border-slate/25 px-4 py-3 text-left text-sm text-slate shadow-sm hover:border-accent"
          >
            Take a note…
          </button>
          <button onClick={() => setEditing(createDraftNote({ isChecklist: true }))} className={ghostBtn}>
            New list
          </button>
        </div>
      )}

      <ErrorNote message={error} />

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-slate">{query ? "No notes match." : showArchive ? "Nothing archived." : "No notes yet."}</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Pinned</h2>
              {grid(pinned)}
            </section>
          )}
          <section className="mt-8">
            {pinned.length > 0 && <h2 className="text-xs font-semibold uppercase tracking-wide text-slate">Others</h2>}
            {grid(others)}
          </section>
        </>
      )}

      {editing && (
        <NoteEditor
          initial={editing}
          isNew={!notes.some((n) => n.id === editing.id)}
          onClose={(n, changed) => {
            setEditing(null);
            const isNew = !notes.some((x) => x.id === n.id);
            if (isNew && isEmptyNote(n)) return;
            if (changed) persist(n);
          }}
          onDelete={(id) => {
            setEditing(null);
            remove(id);
          }}
        />
      )}
    </div>
  );
}

function NoteCard({ note: n, onOpen, onToggleItem }: { note: Note; onOpen: () => void; onToggleItem: (id: string) => void }) {
  const attachments = n.images.length + n.audio.length;
  const unchecked = n.checklist.filter((i) => !i.checked);
  const checkedCount = n.checklist.length - unchecked.length;
  return (
    <div
      onClick={onOpen}
      style={colorStyle(n.color)}
      className={`mb-3 cursor-pointer break-inside-avoid rounded-xl border border-slate/20 p-4 transition-shadow hover:shadow-md ${colorCls}`}
    >
      {n.title && <h3 className="mb-1 text-sm font-semibold text-navy dark:text-foreground">{n.title}</h3>}
      {n.isChecklist ? (
        <ul className="flex flex-col gap-1">
          {unchecked.slice(0, 8).map((i) => (
            <li key={i.id} className="flex items-start gap-2 text-sm text-navy dark:text-foreground">
              <input
                type="checkbox"
                checked={false}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleItem(i.id)}
                className="mt-1 accent-teal-600"
                aria-label={`Check ${i.text}`}
              />
              <span className="min-w-0 break-words">{i.text}</span>
            </li>
          ))}
          {unchecked.length > 8 && <li className="text-xs text-slate">+{unchecked.length - 8} more</li>}
          {checkedCount > 0 && <li className="text-xs text-slate">+{checkedCount} checked</li>}
        </ul>
      ) : (
        n.body && <p className="line-clamp-[10] whitespace-pre-wrap break-words text-sm text-navy dark:text-foreground">{n.body}</p>
      )}
      {attachments > 0 && (
        <p className="mt-2 text-xs text-slate">
          {attachments} attachment{attachments > 1 ? "s" : ""} on your phone
        </p>
      )}
    </div>
  );
}

function NoteEditor({ initial, isNew, onClose, onDelete }: {
  initial: Note;
  isNew: boolean;
  onClose: (n: Note, changed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [n, setN] = useState(initial);
  const [focusId, setFocusId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLInputElement>());
  const set = (patch: Partial<Note>) => setN((cur) => ({ ...cur, ...patch }));
  const close = () => onClose(n, JSON.stringify(n) !== JSON.stringify(initial));

  useEffect(() => {
    if (focusId) itemRefs.current.get(focusId)?.focus();
  }, [focusId]);

  function toggleMode() {
    if (n.isChecklist) {
      set({ isChecklist: false, body: n.checklist.map((i) => i.text).join("\n"), checklist: [] });
    } else {
      const items = n.body
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text): ChecklistItem => ({ id: crypto.randomUUID(), text, checked: false }));
      set({ isChecklist: true, checklist: items, body: "" });
    }
  }

  function addItem(afterId?: string) {
    const item: ChecklistItem = { id: crypto.randomUUID(), text: "", checked: false };
    const list = [...n.checklist];
    const at = afterId ? list.findIndex((i) => i.id === afterId) + 1 : list.filter((i) => !i.checked).length;
    list.splice(at, 0, item);
    set({ checklist: list });
    setFocusId(item.id);
  }

  const patchItem = (id: string, patch: Partial<ChecklistItem>) =>
    set({ checklist: n.checklist.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const itemRow = (i: ChecklistItem) => (
    <li key={i.id} className="flex items-center gap-2">
      <input type="checkbox" checked={i.checked} onChange={() => patchItem(i.id, { checked: !i.checked })} className="accent-teal-600" aria-label="Done" />
      <input
        ref={(el) => {
          if (el) itemRefs.current.set(i.id, el);
          else itemRefs.current.delete(i.id);
        }}
        value={i.text}
        onChange={(e) => patchItem(i.id, { text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addItem(i.id);
          } else if (e.key === "Backspace" && !i.text) {
            e.preventDefault();
            set({ checklist: n.checklist.filter((x) => x.id !== i.id) });
          }
        }}
        placeholder="List item"
        className={`min-w-0 flex-1 bg-transparent py-1 text-sm outline-none ${i.checked ? "text-slate line-through" : "text-navy dark:text-foreground"}`}
      />
      <button onClick={() => set({ checklist: n.checklist.filter((x) => x.id !== i.id) })} className="text-slate hover:text-red-600" aria-label="Remove item">
        ×
      </button>
    </li>
  );

  return (
    <Modal
      onClose={close}
      style={colorStyle(n.color)}
      footer={
        <>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Note color">
            {Object.entries(NOTE_COLORS).map(([key, c]) => (
              <button
                key={key}
                role="radio"
                aria-checked={n.color === key}
                aria-label={key.replace("_", " ")}
                title={key.replace("_", " ")}
                onClick={() => set({ color: key })}
                className={`h-6 w-6 rounded-full border ${n.color === key ? "ring-2 ring-accent ring-offset-1" : "border-slate/30"}`}
                style={{ background: key === "default" ? "transparent" : c.light }}
              />
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-3 text-sm">
            <button onClick={() => set({ pinned: !n.pinned })} className="text-slate hover:text-accent">
              {n.pinned ? "Unpin" : "Pin"}
            </button>
            <button onClick={() => set({ archived: !n.archived, pinned: n.archived ? n.pinned : false })} className="text-slate hover:text-accent">
              {n.archived ? "Unarchive" : "Archive"}
            </button>
            <button onClick={toggleMode} className="text-slate hover:text-accent">
              {n.isChecklist ? "Plain text" : "Checklist"}
            </button>
            {!isNew && (
              <button onClick={() => confirm("Delete this note everywhere?") && onDelete(n.id)} className="text-red-600 hover:underline">
                Delete
              </button>
            )}
            <button onClick={close} className="font-medium text-accent">
              Close
            </button>
          </div>
        </>
      }
    >
      <div className={`-mx-5 -my-4 min-h-[40vh] px-5 py-4 ${colorCls}`}>
        <input
          autoFocus={isNew}
          value={n.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Title"
          className="w-full bg-transparent text-lg font-semibold text-navy outline-none dark:text-foreground"
        />
        {n.isChecklist ? (
          <>
            <ul className="mt-3 flex flex-col">{n.checklist.filter((i) => !i.checked).map(itemRow)}</ul>
            <button onClick={() => addItem()} className="mt-2 text-sm text-slate hover:text-accent">
              + List item
            </button>
            {n.checklist.some((i) => i.checked) && (
              <>
                <p className="mt-4 text-xs font-medium text-slate">{n.checklist.filter((i) => i.checked).length} checked</p>
                <ul className="mt-1 flex flex-col">{n.checklist.filter((i) => i.checked).map(itemRow)}</ul>
              </>
            )}
          </>
        ) : (
          <textarea
            autoFocus={!isNew}
            value={n.body}
            onChange={(e) => set({ body: e.target.value })}
            placeholder="Take a note…"
            rows={10}
            className="mt-3 w-full resize-none bg-transparent text-sm text-navy outline-none dark:text-foreground"
          />
        )}
        {n.images.length + n.audio.length > 0 && (
          <p className="mt-3 text-xs text-slate">
            This note has {n.images.length + n.audio.length} attachment(s). Open it on your phone to see them; saving here keeps them.
          </p>
        )}
      </div>
    </Modal>
  );
}
