"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  deleteRecipientList,
  deleteTemplate,
  listRecipientLists,
  listTemplates,
  parseRecipients,
  saveRecipientList,
  saveTemplate,
} from "@/lib/journey/messages";
import type { MessageTemplate, RecipientList } from "@/lib/journey/types";
import { ErrorNote, Modal, PageHeader, ghostBtn, inputCls, primaryBtn } from "@/components/journey/ui";

// Manage the reusable pieces of the phone's Auto Scheduler from a keyboard:
// message templates and recipient lists. Scheduling and sending stay on the
// phone, which picks these up on its next sync.

export default function MessagesPage() {
  const [tab, setTab] = useState<"templates" | "lists">("templates");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [lists, setLists] = useState<RecipientList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState<MessageTemplate | null>(null);
  const [editList, setEditList] = useState<RecipientList | null>(null);

  const load = useCallback(() => {
    Promise.all([listTemplates(), listRecipientLists()])
      .then(([t, l]) => {
        setTemplates(t);
        setLists(l);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const tabBtn = (id: typeof tab, label: string, count: number) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === id ? "bg-accent text-white" : "text-slate hover:text-accent"}`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <PageHeader
        title="Messages"
        subtitle="Templates and recipient lists for the Auto Scheduler. Sending still happens on your phone."
        action={
          <button
            className={primaryBtn}
            onClick={() =>
              tab === "templates"
                ? setEditTemplate({ id: crypto.randomUUID(), name: "", message: "", updatedAt: Date.now() })
                : setEditList({ id: crypto.randomUUID(), name: "", members: [], updatedAt: Date.now() })
            }
          >
            {tab === "templates" ? "+ New template" : "+ New list"}
          </button>
        }
      />
      <div className="mt-6 flex gap-1">
        {tabBtn("templates", "Templates", templates.length)}
        {tabBtn("lists", "Recipient lists", lists.length)}
      </div>

      <ErrorNote message={error} />

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading...</p>
      ) : tab === "templates" ? (
        templates.length === 0 ? (
          <p className="mt-6 text-sm text-slate">No templates yet. Save a message you send often, then pick it when you schedule a text.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-2">
            {templates.map((t) => (
              <li key={t.id}>
                <button onClick={() => setEditTemplate(t)} className="block w-full rounded-lg border border-slate/15 px-4 py-3 text-left hover:border-accent">
                  <div className="text-sm font-medium text-navy dark:text-foreground">{t.name || "Untitled template"}</div>
                  <div className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-slate">{t.message}</div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : lists.length === 0 ? (
        <p className="mt-6 text-sm text-slate">No recipient lists yet. Group the people you text together, or import a CSV or vCard.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {lists.map((l) => (
            <li key={l.id}>
              <button onClick={() => setEditList(l)} className="block w-full rounded-lg border border-slate/15 px-4 py-3 text-left hover:border-accent">
                <div className="text-sm font-medium text-navy dark:text-foreground">{l.name || "Untitled list"}</div>
                <div className="mt-0.5 truncate text-xs text-slate">
                  {l.members.length} {l.members.length === 1 ? "person" : "people"}
                  {l.members.length > 0 && ` · ${l.members.map((m) => m.name || m.phone).join(", ")}`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editTemplate && (
        <TemplateEditor
          initial={editTemplate}
          isNew={!templates.some((t) => t.id === editTemplate.id)}
          onClose={() => setEditTemplate(null)}
          onSave={(t) => run(() => saveTemplate(t)).then(() => setEditTemplate(null))}
          onDelete={(id) => run(() => deleteTemplate(id)).then(() => setEditTemplate(null))}
        />
      )}
      {editList && (
        <ListEditor
          initial={editList}
          isNew={!lists.some((l) => l.id === editList.id)}
          onClose={() => setEditList(null)}
          onSave={(l) => run(() => saveRecipientList(l)).then(() => setEditList(null))}
          onDelete={(id) => run(() => deleteRecipientList(id)).then(() => setEditList(null))}
        />
      )}
    </div>
  );
}

function EditorFooter({ isNew, onSave, onClose, onDelete, saveDisabled }: {
  isNew: boolean;
  onSave: () => void;
  onClose: () => void;
  onDelete: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <>
      <button onClick={onSave} disabled={saveDisabled} className={primaryBtn}>
        Save
      </button>
      <button onClick={onClose} className={ghostBtn}>
        Cancel
      </button>
      {!isNew && (
        <button onClick={() => confirm("Delete this everywhere?") && onDelete()} className="ml-auto text-sm text-red-600 hover:underline">
          Delete
        </button>
      )}
    </>
  );
}

function TemplateEditor({ initial, isNew, onClose, onSave, onDelete }: {
  initial: MessageTemplate;
  isNew: boolean;
  onClose: () => void;
  onSave: (t: MessageTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const [t, setT] = useState(initial);
  return (
    <Modal
      title={isNew ? "New template" : "Edit template"}
      onClose={onClose}
      footer={<EditorFooter isNew={isNew} saveDisabled={!t.name.trim() || !t.message.trim()} onSave={() => onSave(t)} onClose={onClose} onDelete={() => onDelete(t.id)} />}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate">
          Name
          <input autoFocus value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Running late" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate">
          Message
          <textarea value={t.message} onChange={(e) => setT({ ...t, message: e.target.value })} rows={6} className={inputCls} />
          <span className="text-xs">{t.message.length} characters</span>
        </label>
      </div>
    </Modal>
  );
}

function ListEditor({ initial, isNew, onClose, onSave, onDelete }: {
  initial: RecipientList;
  isNew: boolean;
  onClose: () => void;
  onSave: (l: RecipientList) => void;
  onDelete: (id: string) => void;
}) {
  const [l, setL] = useState(initial);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const found = parseRecipients(await file.text());
    const known = new Set(l.members.map((m) => m.phone.replace(/\D/g, "")));
    const fresh = found.filter((m) => !known.has(m.phone.replace(/\D/g, "")));
    setL({ ...l, members: [...l.members, ...fresh] });
    setNote(found.length ? `Added ${fresh.length} of ${found.length} contacts${fresh.length < found.length ? " (the rest were already here)" : ""}.` : "No phone numbers found in that file.");
  }

  const patch = (i: number, field: "name" | "phone", value: string) =>
    setL({ ...l, members: l.members.map((m, j) => (j === i ? { ...m, [field]: value } : m)) });
  const valid = l.name.trim() && l.members.length > 0 && l.members.every((m) => m.phone.trim());

  return (
    <Modal
      title={isNew ? "New recipient list" : "Edit recipient list"}
      onClose={onClose}
      footer={
        <EditorFooter
          isNew={isNew}
          saveDisabled={!valid}
          onSave={() => onSave({ ...l, members: l.members.map((m) => ({ name: m.name.trim(), phone: m.phone.trim() })) })}
          onClose={onClose}
          onDelete={() => onDelete(l.id)}
        />
      }
    >
      <input ref={fileRef} type="file" accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard" className="hidden" onChange={importFile} />
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate">
          List name
          <input autoFocus value={l.name} onChange={(e) => setL({ ...l, name: e.target.value })} placeholder="Family" className={inputCls} />
        </label>
        <div className="flex flex-col gap-2 text-sm text-slate">
          People
          {l.members.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={m.name} onChange={(e) => patch(i, "name", e.target.value)} placeholder="Name" className={`${inputCls} min-w-0 flex-1`} />
              <input value={m.phone} onChange={(e) => patch(i, "phone", e.target.value)} placeholder="+91 98765 43210" inputMode="tel" className={`${inputCls} min-w-0 flex-1`} />
              <button onClick={() => setL({ ...l, members: l.members.filter((_, j) => j !== i) })} className="text-slate hover:text-red-600" aria-label="Remove person">
                ×
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setL({ ...l, members: [...l.members, { name: "", phone: "" }] })} className="text-xs font-medium text-accent hover:underline">
              + Add person
            </button>
            <button onClick={() => fileRef.current?.click()} className="text-xs font-medium text-accent hover:underline">
              Import CSV or vCard
            </button>
          </div>
          {note && <p className="text-xs">{note}</p>}
        </div>
      </div>
    </Modal>
  );
}
