"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NAG_OPTIONS,
  TYPE_LABELS,
  WEEKDAYS,
  createDraftReminder,
  deleteReminder,
  listReminders,
  localISODate,
  markDone,
  nextTrigger,
  occursOn,
  saveReminder,
  scheduleLabel,
  setEnabled,
  validate,
} from "@/lib/journey/reminders";
import type { Reminder, ReminderType } from "@/lib/journey/types";
import { ErrorNote, Modal, PageHeader, ghostBtn, inputCls, primaryBtn } from "@/components/journey/ui";
import { ALERTS_CHANGED_EVENT, useReminderAlertsSetting } from "@/components/journey/ReminderAlerts";

function formatNext(d: Date | null) {
  if (!d) return "No upcoming time";
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (localISODate(d) === localISODate(today)) return `Today at ${time}`;
  if (localISODate(d) === localISODate(tomorrow)) return `Tomorrow at ${time}`;
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + ` at ${time}`;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const alerts = useReminderAlertsSetting();

  const load = useCallback(() => {
    listReminders()
      .then(setReminders)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load reminders."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>, optimistic?: Reminder) {
    setError(null);
    // Toggles and Done flip right away; the reload after the save confirms them.
    if (optimistic) setReminders((cur) => cur.map((r) => (r.id === optimistic.id ? optimistic : r)));
    try {
      await action();
      window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const today = localISODate();
  const now = new Date();
  const active = reminders.filter((r) => r.enabled && !r.completed && nextTrigger(r, now));
  const dueToday = reminders
    .filter((r) => r.enabled && !r.completed && occursOn(r, now))
    .sort((a, b) => ([...a.timesOfDay].sort()[0] ?? "").localeCompare([...b.timesOfDay].sort()[0] ?? ""));
  const upcoming = active
    .filter((r) => !occursOn(r, now))
    .sort((a, b) => nextTrigger(a, now)!.getTime() - nextTrigger(b, now)!.getTime());
  const inactive = reminders.filter((r) => !dueToday.includes(r) && !upcoming.includes(r));

  function Row({ r }: { r: Reminder }) {
    const doneToday = r.doneForDay === today;
    const isToday = dueToday.includes(r);
    return (
      <li className="flex items-start gap-3 rounded-lg border border-slate/15 px-4 py-3">
        <button onClick={() => setEditing(r)} className="min-w-0 flex-1 text-left">
          <div className={`text-sm font-medium ${doneToday || r.completed ? "text-slate line-through" : "text-navy dark:text-foreground"}`}>
            {r.title || "Untitled reminder"}
          </div>
          <div className="mt-0.5 text-xs text-slate">{scheduleLabel(r)}</div>
          {r.enabled && !r.completed && <div className="mt-0.5 text-xs text-accent">Next: {formatNext(nextTrigger(r, now))}</div>}
          {r.notes && <div className="mt-1 line-clamp-2 text-xs text-slate">{r.notes}</div>}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {isToday && !doneToday && (
            <button
              onClick={() => run(() => markDone(r), r.type === "ONE_TIME" ? { ...r, completed: true } : { ...r, doneForDay: today })}
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90">
              Done
            </button>
          )}
          {isToday && doneToday && <span className="text-xs text-accent">Done today</span>}
          <label className="flex items-center gap-1.5 text-xs text-slate">
            <input type="checkbox" checked={r.enabled && !r.completed} onChange={(e) => {
                const on = e.target.checked;
                run(() => (on ? saveReminder(r) : setEnabled(r, false)), on ? { ...r, enabled: true, completed: false, doneForDay: null } : { ...r, enabled: false });
              }} className="accent-teal-600" />
            On
          </label>
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <PageHeader
        title="Reminders"
        subtitle="Synced with the Reminders app. Your phone rings for these once it syncs."
        action={
          <button onClick={() => setEditing(createDraftReminder())} className={primaryBtn}>
            + New reminder
          </button>
        }
      />

      {alerts.supported && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate/15 px-4 py-3 text-sm">
          <span className="text-slate">
            {alerts.enabled ? "This browser will also alert you while a Journey tab is open." : "Get browser alerts too while a Journey tab is open."}
          </span>
          <button onClick={alerts.toggle} className={ghostBtn}>
            {alerts.enabled ? "Turn off browser alerts" : "Turn on browser alerts"}
          </button>
        </div>
      )}

      <ErrorNote message={error} />

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading...</p>
      ) : reminders.length === 0 ? (
        <p className="mt-6 text-sm text-slate">No reminders yet. Birthdays, bills, habits: add one and it&apos;ll ring on your phone too.</p>
      ) : (
        <>
          {[
            ["Today", dueToday],
            ["Upcoming", upcoming],
            ["Paused & finished", inactive],
          ].map(([label, list]) =>
            (list as Reminder[]).length ? (
              <section key={label as string} className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">{label as string}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {(list as Reminder[]).map((r) => (
                    <Row key={r.id} r={r} />
                  ))}
                </ul>
              </section>
            ) : null
          )}
        </>
      )}

      {editing && (
        <ReminderEditor
          initial={editing}
          isNew={!reminders.some((r) => r.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(r) => run(() => saveReminder(r)).then(() => setEditing(null))}
          onDelete={(id) => run(() => deleteReminder(id)).then(() => setEditing(null))}
        />
      )}
    </div>
  );
}

function ReminderEditor({ initial, isNew, onClose, onSave, onDelete }: {
  initial: Reminder;
  isNew: boolean;
  onClose: () => void;
  onSave: (r: Reminder) => void;
  onDelete: (id: string) => void;
}) {
  const [r, setR] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (patch: Partial<Reminder>) => setR((cur) => ({ ...cur, ...patch }));

  function submit() {
    const msg = validate(r);
    if (msg) return setProblem(msg);
    onSave(r);
  }

  const yearlyDate = `2024-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;

  return (
    <Modal
      title={isNew ? "New reminder" : "Edit reminder"}
      onClose={onClose}
      footer={
        <>
          <button onClick={submit} className={primaryBtn}>
            Save
          </button>
          <button onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          {!isNew && (
            <button onClick={() => confirm("Delete this reminder everywhere?") && onDelete(r.id)} className="ml-auto text-sm text-red-600 hover:underline">
              Delete
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate">
          Title
          <input autoFocus value={r.title} onChange={(e) => set({ title: e.target.value })} placeholder="Mum's birthday" className={inputCls} />
        </label>

        <div className="flex flex-col gap-1 text-sm text-slate">
          Repeats
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TYPE_LABELS) as ReminderType[]).map((t) => (
              <button
                key={t}
                onClick={() => set({ type: t })}
                className={`rounded-full border px-3 py-1 text-xs ${r.type === t ? "border-accent bg-accent text-white" : "border-slate/25 text-slate hover:border-accent"}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {r.type === "ONE_TIME" && (
          <label className="flex flex-col gap-1 text-sm text-slate">
            Date
            <input type="date" value={r.oneTimeDate ?? ""} onChange={(e) => set({ oneTimeDate: e.target.value || null })} className={inputCls} />
          </label>
        )}
        {r.type === "WEEKLY" && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((name, i) => {
              const on = r.daysOfWeek.includes(i + 1);
              return (
                <button
                  key={name}
                  onClick={() => set({ daysOfWeek: on ? r.daysOfWeek.filter((d) => d !== i + 1) : [...r.daysOfWeek, i + 1].sort() })}
                  className={`h-9 w-11 rounded-lg border text-xs ${on ? "border-accent bg-accent text-white" : "border-slate/25 text-slate"}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
        {r.type === "MONTHLY" && (
          <label className="flex flex-col gap-1 text-sm text-slate">
            Day of the month
            <input type="number" min={1} max={31} value={r.dayOfMonth} onChange={(e) => set({ dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} className={inputCls} />
            <span className="text-xs">Shorter months use their last day.</span>
          </label>
        )}
        {r.type === "YEARLY" && (
          <label className="flex flex-col gap-1 text-sm text-slate">
            Date each year
            <input
              type="date"
              value={yearlyDate}
              onChange={(e) => {
                const [, m, d] = e.target.value.split("-").map(Number);
                if (m && d) set({ month: m, day: d });
              }}
              className={inputCls}
            />
            <span className="text-xs">Only the day and month are used.</span>
          </label>
        )}

        <div className="flex flex-col gap-1.5 text-sm text-slate">
          Times of day
          {r.timesOfDay.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={t}
                onChange={(e) => set({ timesOfDay: r.timesOfDay.map((x, j) => (j === i ? e.target.value : x)) })}
                className={`${inputCls} flex-1`}
              />
              {r.timesOfDay.length > 1 && (
                <button onClick={() => set({ timesOfDay: r.timesOfDay.filter((_, j) => j !== i) })} className="text-xs text-slate hover:text-red-600" aria-label="Remove time">
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => set({ timesOfDay: [...r.timesOfDay, r.timesOfDay[r.timesOfDay.length - 1] ?? "09:00"] })}
            className="self-start text-xs font-medium text-accent hover:underline"
          >
            + Add another time
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate">
          If I don&apos;t tap Done, remind me again
          <select value={r.nagIntervalMinutes} onChange={(e) => set({ nagIntervalMinutes: Number(e.target.value) })} className={inputCls}>
            {NAG_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "Never" : `Every ${m} minutes`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate">
          <input type="checkbox" checked={r.alarmStyle} onChange={(e) => set({ alarmStyle: e.target.checked })} className="accent-teal-600" />
          Ring like an alarm on my phone (otherwise a normal notification)
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate">
          Notes
          <textarea value={r.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} className={inputCls} />
        </label>

        {problem && <p className="text-sm text-red-600">{problem}</p>}
      </div>
    </Modal>
  );
}
