"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Finding = {
  id: string;
  created_at: string;
  question: string;
  say: string;
  section: string;
  item: string;
  severity: string;
  action: string;
  thumb: string | null;
  has_photo: boolean;
};

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  Major: "bg-amber-100 text-amber-900 border-amber-200",
  Minor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const SEVERITY_ORDER = ["Critical", "Major", "Minor"];

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function HistoryView() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All");
  const [section, setSection] = useState("All");
  const [photosOnly, setPhotosOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/inspector/findings");
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data?.error || "Could not load the log.");
        setFindings(data.findings ?? []);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    const unique = new Set(findings.map((finding) => finding.section).filter(Boolean));
    return ["All", ...Array.from(unique).sort()];
  }, [findings]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return findings.filter((finding) => {
      if (severity !== "All" && finding.severity !== severity) return false;
      if (section !== "All" && finding.section !== section) return false;
      if (photosOnly && !finding.has_photo) return false;
      if (!needle) return true;
      return [finding.question, finding.say, finding.item, finding.action]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [findings, query, severity, section, photosOnly]);

  // Group into days, preserving the newest-first order the API returned.
  const days = useMemo(() => {
    const grouped: { label: string; items: Finding[] }[] = [];
    for (const finding of visible) {
      const label = dayLabel(finding.created_at);
      const last = grouped[grouped.length - 1];
      if (last && last.label === label) last.items.push(finding);
      else grouped.push({ label, items: [finding] });
    }
    return grouped;
  }, [visible]);

  const criticalCount = findings.filter((finding) => finding.severity === "Critical").length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-7">
        <Link href="/inspector" className="text-xs font-medium text-teal-700 hover:underline">
          ← Back to the co-pilot
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Findings log</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {loading
            ? "Loading…"
            : `${findings.length} finding${findings.length === 1 ? "" : "s"} logged${
                criticalCount ? ` · ${criticalCount} critical` : ""
              }`}
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-5 mb-6 border-b border-slate-200 bg-white/90 px-5 pb-4 pt-2 backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search findings — part, symptom, action…"
          className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-slate-700"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {["All", ...SEVERITY_ORDER].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSeverity(option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                severity === option
                  ? "border-slate-900 bg-slate-900 text-white dark:border-teal-600 dark:bg-teal-600"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {option}
            </button>
          ))}

          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className="rounded-full border border-slate-200 bg-transparent px-3 py-1.5 text-xs dark:border-slate-700"
          >
            {sections.map((option) => (
              <option key={option} value={option}>
                {option === "All" ? "All sections" : option}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={photosOnly}
              onChange={(event) => setPhotosOnly(event.target.checked)}
              className="h-3.5 w-3.5 accent-teal-600"
            />
            With photo
          </label>

          {visible.length !== findings.length && (
            <span className="text-xs text-slate-500">{visible.length} shown</span>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {!loading && !error && findings.length === 0 && (
        <p className="text-sm text-slate-500">
          Nothing logged yet. Findings appear here as inspectors use the co-pilot.
        </p>
      )}

      {!loading && !error && findings.length > 0 && visible.length === 0 && (
        <p className="text-sm text-slate-500">No findings match those filters.</p>
      )}

      {days.map((day) => (
        <section key={day.label} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {day.label}
          </h2>
          <ul className="space-y-3">
            {day.items.map((finding) => (
              <li
                key={finding.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex gap-4">
                  {finding.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={finding.thumb}
                      alt="Inspection photo"
                      className="h-16 w-16 flex-none rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-xs text-slate-500">“{finding.question}”</p>
                      <span className="flex-none text-xs text-slate-400">
                        {timeLabel(finding.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{finding.say}</p>
                  </div>
                </div>

                {(finding.severity || finding.section || finding.item) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {finding.severity && (
                      <span
                        className={`rounded-full border px-2.5 py-1 font-semibold ${
                          SEVERITY_STYLES[finding.severity] ??
                          "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {finding.severity}
                      </span>
                    )}
                    {finding.section && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {finding.section}
                      </span>
                    )}
                    {finding.item && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {finding.item}
                      </span>
                    )}
                  </div>
                )}

                {finding.action && (
                  <p className="mt-3 border-l-2 border-teal-600 pl-3 text-xs text-slate-600 dark:text-slate-300">
                    {finding.action}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
