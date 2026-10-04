"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxed, readCode, SEV, writeCode, type Finding } from "../shared";

type Rating = { part: string; said: string; correct: boolean; truth: string };

type Item = {
  id: string;
  created_at: string;
  model: string | null;
  secs: number | null;
  media_kind: "image" | "frames";
  view: string | null;
  findings: Omit<Finding, "options">[] | null;
  also_check: string | null;
  photo_ok: boolean | null;
  retake_reason: string | null;
  error: string | null;
  thumb: string | null;
  media: { url: string; t: number }[];
  ratings: Rating[];
};

type Filter = "all" | "photo" | "video" | "wrong" | "unrated" | "error";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photos" },
  { id: "video", label: "Videos" },
  { id: "wrong", label: "Marked wrong" },
  { id: "unrated", label: "Not rated" },
  { id: "error", label: "Failed" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const mmss = (t: number) => {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function ratingFor(item: Item, f: Omit<Finding, "options">) {
  // Latest verdict on this finding wins if it was re-rated.
  return [...item.ratings].reverse().find((r) => r.part === f.part && r.said === f.issue);
}

function CheckCard({ item }: { item: Item }) {
  const findings = item.findings ?? [];
  const isVideo = item.media_kind === "frames";
  const [picked, setPicked] = useState<number | null>(null);

  // Frames that findings point to, each drawn once with all of its boxes.
  const pointed = Array.from(new Set(findings.map((f) => f.frame))).filter((fi) => item.media[fi]);
  const shownFrames = picked !== null ? [picked] : pointed.length ? pointed : item.media.length ? [0] : [];

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{when(item.created_at)}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-bold dark:bg-neutral-800">
          {isVideo ? `Video · ${item.media.length || "?"} frames` : "Photo"}
        </span>
        {item.secs != null && <span>{item.secs} s</span>}
        {item.model && <span className="font-mono">{item.model}</span>}
      </header>

      {shownFrames.map((fi) => (
        <div key={fi} className="flex flex-col gap-1">
          <Boxed
            src={item.media[fi].url}
            findings={findings.map((f) => (f.frame === fi ? f : { box: null }))}
            index={findings.map((_, i) => i)}
          />
          {isVideo && <p className="text-xs text-neutral-500">At {mmss(item.media[fi].t)} in the video</p>}
        </div>
      ))}
      {!item.media.length && item.thumb && (
        // Media uploads finish just after the answer; until then (or for old rows) show the thumbnail.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumb} alt="Inspected part" className="w-40 rounded-xl" />
      )}

      {isVideo && item.media.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {item.media.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPicked(picked === i ? null : i)}
              className={`flex-none overflow-hidden rounded-lg ring-2 ${picked === i ? "ring-violet-600" : "ring-transparent"}`}
              aria-label={`Show frame at ${mmss(m.t)}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="h-[54px] w-[72px] object-cover" />
            </button>
          ))}
        </div>
      )}

      {item.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          Failed: {item.error}
        </p>
      )}
      {item.photo_ok === false && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <strong>Retake asked:</strong> {item.retake_reason || "photo not clear enough."}
        </p>
      )}
      {item.view && <p className="text-sm text-neutral-600 dark:text-neutral-300">{item.view}</p>}
      {!item.error && findings.length === 0 && (
        <p className="text-sm text-neutral-500">No part identified.</p>
      )}

      {findings.map((f, i) => {
        const r = ratingFor(item, f);
        return (
          <div key={i} className="flex gap-2.5 border-t border-neutral-200 pt-2.5 dark:border-neutral-800">
            <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#FF4D57] text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs text-neutral-500">{f.part}</p>
              <p className="text-lg font-extrabold leading-tight">{f.issue}</p>
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                {f.severity && <span className={`rounded-full px-2 py-0.5 ${SEV[f.severity]}`}>{f.severity}</span>}
                {f.action && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {f.action}
                  </span>
                )}
                {f.structural && <span className={`rounded-full px-2 py-0.5 ${SEV.Major}`}>Structural</span>}
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {f.confidence}% sure
                </span>
                {isVideo && f.time && <span className="text-neutral-500">@ {f.time}</span>}
              </div>
              {f.reason && <p className="text-sm">{f.reason}</p>}
              {r ? (
                <p
                  className={`text-xs font-bold ${r.correct ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                >
                  {r.correct ? "✓ Inspector: right" : `✗ Inspector: wrong, should be ${r.truth}`}
                </p>
              ) : (
                <p className="text-xs text-neutral-400">Not rated</p>
              )}
            </div>
          </div>
        );
      })}

      {item.also_check && (
        <p className="text-[13px] text-neutral-500">
          <strong>Also check:</strong> {item.also_check}
        </p>
      )}
    </article>
  );
}

export default function HistoryView() {
  const [code, setCode] = useState(readCode);
  const [needCode, setNeedCode] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(
    // Callers set loading first; the initial state is already "loading".
    (before?: string) => {
      const url = `/api/issue-check/history${before ? `?before=${encodeURIComponent(before)}` : ""}`;
      return fetch(url, { headers: { "x-access-code": code } })
        .then(async (res) => {
          if (res.status === 401) {
            setNeedCode(true);
            return;
          }
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Could not load history.");
          setItems((prev) => (before ? [...prev, ...json.items] : json.items));
          setMore(json.more);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load history."))
        .finally(() => setLoading(false));
    },
    [code]
  );

  useEffect(() => {
    load();
    // Once on open; the code form triggers its own reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      const f = it.findings ?? [];
      if (filter === "photo" && it.media_kind !== "image") return false;
      if (filter === "video" && it.media_kind !== "frames") return false;
      if (filter === "wrong" && !it.ratings.some((r) => !r.correct)) return false;
      if (filter === "unrated" && (it.ratings.length > 0 || f.length === 0)) return false;
      if (filter === "error" && !it.error) return false;
      if (!needle) return true;
      const hay = [it.view, it.error, ...f.flatMap((x) => [x.part, x.issue, x.reason])].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [items, filter, q]);

  const rated = items.flatMap((i) => i.ratings);
  const right = rated.filter((r) => r.correct).length;

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-3.5 px-4 pb-12 pt-4 text-[15px] leading-snug">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-violet-600 dark:text-violet-400">
            Inspect Agent
          </p>
          <h1 className="mt-0.5 text-[23px] font-extrabold">Issue Check history</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Every photo and video checked, what the AI said, and what inspectors rated it.
          </p>
        </div>
        <Link
          href="/issue-check"
          className="flex-none rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white"
        >
          New check
        </Link>
      </header>

      {needCode && (
        <form
          className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
          onSubmit={(e) => {
            e.preventDefault();
            writeCode(code);
            setNeedCode(false);
            setLoading(true);
            setError("");
            load();
          }}
        >
          <label htmlFor="ich-code" className="font-semibold">
            Access code
          </label>
          <input
            id="ich-code"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            className="rounded-lg border border-neutral-300 bg-neutral-50 p-2.5 dark:border-neutral-700 dark:bg-neutral-800"
            autoComplete="off"
          />
          <button className="min-h-[46px] rounded-xl bg-violet-600 font-bold text-white">Open history</button>
        </form>
      )}

      <div className="flex gap-4 text-[13px] text-neutral-500">
        <div>
          <strong className="block text-lg text-neutral-900 dark:text-neutral-100">
            {items.length}
            {more ? "+" : ""}
          </strong>
          checks
        </div>
        <div>
          <strong className="block text-lg text-neutral-900 dark:text-neutral-100">{rated.length}</strong>
          ratings
        </div>
        <div>
          <strong className="block text-lg text-neutral-900 dark:text-neutral-100">
            {rated.length ? `${Math.round((right / rated.length) * 100)}%` : "–"}
          </strong>
          rated right
        </div>
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search part or issue, e.g. bumper, dent"
        className="rounded-xl border border-neutral-300 bg-white p-2.5 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === f.id
                ? "bg-violet-600 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="font-semibold text-red-600">{error}</p>}
      {!loading && !error && !needCode && shown.length === 0 && (
        <p className="text-neutral-500">{items.length ? "Nothing matches this filter." : "No checks yet."}</p>
      )}

      {shown.map((it) => (
        <CheckCard key={it.id} item={it} />
      ))}

      {loading && <p className="text-neutral-500">Loading…</p>}
      {more && !loading && (
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            load(items[items.length - 1]?.created_at);
          }}
          className="min-h-[48px] rounded-xl bg-neutral-100 font-bold dark:bg-neutral-800"
        >
          Load older checks
        </button>
      )}
    </div>
  );
}
