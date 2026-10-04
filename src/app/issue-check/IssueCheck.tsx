"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Frame = { mime: string; data: string; t: number; url: string };

type Finding = {
  part: string;
  issueId: number;
  issue: string;
  action: string;
  severity: "" | "Micro" | "Minor" | "Major";
  structural: boolean;
  inList: boolean;
  confidence: number;
  reason: string;
  box: [number, number, number, number] | null;
  frame: number;
  time: string;
  options: [number, string][];
};

type Result = {
  view: string;
  photoOk: boolean;
  retakeReason: string;
  alsoCheck: string;
  findings: Finding[];
  secs: number;
  model: string;
  checkId: string | null;
};

type Rating = { state: "open" | "fixing" | "saved"; label?: string };

const CODE_KEY = "issue-check-code";
const MAX_VIDEO_SECS = 120;

function readCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeCode(v: string) {
  try {
    localStorage.setItem(CODE_KEY, v);
  } catch {}
}

/** Draws a source onto a canvas no larger than `max` px and returns base64 JPEG. */
function toJpeg(src: CanvasImageSource, w: number, h: number, max: number, q: number) {
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", q);
  return { url, data: url.split(",")[1] };
}

async function imageFrames(file: File): Promise<Frame[]> {
  const bmp = await createImageBitmap(file);
  const { url, data } = toJpeg(bmp, bmp.width, bmp.height, 1280, 0.82);
  bmp.close();
  return [{ mime: "image/jpeg", data, t: 0, url }];
}

/** Samples one frame every ~4 s (6–20 frames). No sound: frames work with every model and stay small. */
async function videoFrames(file: File): Promise<Frame[]> {
  const src = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = src;
  try {
    await new Promise<void>((ok, bad) => {
      v.onloadeddata = () => ok();
      v.onerror = () => bad(new Error("This video could not be opened. Try a photo instead."));
    });
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0) throw new Error("This video could not be read.");
    if (dur > MAX_VIDEO_SECS + 1) throw new Error("Video is longer than 2 minutes. Record a shorter one.");
    const n = Math.max(6, Math.min(20, Math.ceil(dur / 4)));
    const out: Frame[] = [];
    for (let i = 0; i < n; i++) {
      const t = Math.min(dur - 0.05, (dur * (i + 0.5)) / n);
      await new Promise<void>((ok) => {
        v.onseeked = () => ok();
        v.currentTime = t;
      });
      const { url, data } = toJpeg(v, v.videoWidth, v.videoHeight, 768, 0.7);
      out.push({ mime: "image/jpeg", data, t, url });
    }
    return out;
  } finally {
    URL.revokeObjectURL(src);
  }
}

function thumbOf(f: Frame): Promise<string> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(toJpeg(img, img.width, img.height, 240, 0.6).url);
    img.onerror = () => ok("");
    img.src = f.url;
  });
}

const SEV: Record<string, string> = {
  Micro: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Minor: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  Major: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function Boxed({ frame, findings, index }: { frame: Frame; findings: Finding[]; index: number[] }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frame.url} alt="Inspected part" className="block h-auto w-full" />
      {findings.map((f, i) =>
        f.box ? (
          <div
            key={i}
            className="absolute rounded-md border-[2.5px] border-[#FF4D57] shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
            style={{
              top: `${f.box[0] / 10}%`,
              left: `${f.box[1] / 10}%`,
              height: `${(f.box[2] - f.box[0]) / 10}%`,
              width: `${(f.box[3] - f.box[1]) / 10}%`,
            }}
          >
            <span className="absolute -left-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-[#FF4D57] text-xs font-bold text-white">
              {index[i] + 1}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

export default function IssueCheck() {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [kind, setKind] = useState<"image" | "frames">("image");
  const [busy, setBusy] = useState<"" | "reading" | "checking">("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  // readCode() falls back to "" during server render; the code field only shows after a 401.
  const [code, setCode] = useState(readCode);
  const [needCode, setNeedCode] = useState(false);
  const [session, setSession] = useState({ rated: 0, right: 0, times: [] as number[] });
  const [overall, setOverall] = useState<{ rated: number; right: number } | null>(null);

  const headers = useCallback(
    (): HeadersInit => ({ "Content-Type": "application/json", "x-access-code": code }),
    [code]
  );

  const loadOverall = useCallback(
    () =>
      fetch("/api/issue-check/rate", { headers: headers() })
        .then(async (res) => {
          if (res.status === 401) setNeedCode(true);
          else if (res.ok) setOverall(await res.json());
        })
        .catch(() => {}),
    [headers]
  );

  // Once on open; re-fetched after each rating and after the access code is saved,
  // not on every keystroke in the code field.
  useEffect(() => {
    loadOverall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setResult(null);
    setRatings([]);
    setBusy("reading");
    let fr: Frame[];
    let k: "image" | "frames";
    try {
      if (file.type.startsWith("video/")) {
        fr = await videoFrames(file);
        k = "frames";
      } else if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
        fr = await imageFrames(file);
        k = "image";
      } else {
        throw new Error("Pick a photo or a video.");
      }
    } catch (e) {
      setBusy("");
      setFrames([]);
      setError(e instanceof Error ? e.message : "This file could not be read.");
      return;
    }
    setFrames(fr);
    setKind(k);
    await check(fr, k);
  }

  async function check(fr: Frame[], k: "image" | "frames") {
    setBusy("checking");
    setError("");
    try {
      const res = await fetch("/api/issue-check", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          kind: k,
          media: fr.map(({ mime, data, t }) => ({ mime, data, t })),
          thumb: await thumbOf(fr[0]),
        }),
      });
      const json = await res.json().catch(() => ({ error: "The server answer could not be read." }));
      if (res.status === 401) {
        setNeedCode(true);
        throw new Error("Enter the access code first.");
      }
      if (!res.ok) throw new Error(json.error || "Check failed. Try again.");
      setResult(json);
      setRatings(json.findings.map(() => ({ state: "open" })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed. Try again.");
    } finally {
      setBusy("");
    }
  }

  function rate(i: number, correct: boolean, truth: string) {
    if (!result) return;
    const f = result.findings[i];
    setRatings((r) => r.map((x, j) => (j === i ? { state: "saved", label: correct ? "right ✓" : `should be ${truth}` } : x)));
    setSession((s) => ({
      rated: s.rated + 1,
      right: s.right + (correct ? 1 : 0),
      times: [...s.times, result.secs],
    }));
    fetch("/api/issue-check/rate", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        checkId: result.checkId,
        model: result.model,
        part: f.part,
        said: f.issue,
        correct,
        truth,
      }),
    })
      .then(() => loadOverall())
      .catch(() => {});
  }

  function next() {
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
    camRef.current?.click();
  }

  const avg = session.times.length
    ? `${(session.times.reduce((a, b) => a + b, 0) / session.times.length).toFixed(1)} s`
    : "–";

  // Group findings by the frame they point at, so each frame is drawn once with all its boxes.
  const shown = result
    ? Array.from(new Set(result.findings.map((f) => f.frame))).map((fi) => ({
        fi,
        list: result.findings.map((f, i) => ({ f, i })).filter((x) => x.f.frame === fi),
      }))
    : [];

  const seniorText = result
    ? `Inspection help needed\n${result.findings
        .map((f, i) => `${i + 1}. ${f.part}: ${f.issue} (${f.confidence}% sure)`)
        .join("\n")}\nPlease confirm what to mark. Photo attached.`
    : "";

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-3.5 px-4 pb-12 pt-4 text-[15px] leading-snug">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-violet-600 dark:text-violet-400">
          Inspect Agent
        </p>
        <h1 className="mt-0.5 text-[23px] font-extrabold">Issue Check</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Take a photo or a short video of a part. The AI says which part it is and which issue to mark.
        </p>
      </header>

      {needCode && (
        <form
          className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
          onSubmit={(e) => {
            e.preventDefault();
            writeCode(code);
            setNeedCode(false);
            setError("");
            loadOverall();
          }}
        >
          <label htmlFor="ic-code" className="font-semibold">
            Access code
          </label>
          <input
            id="ic-code"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            className="rounded-lg border border-neutral-300 bg-neutral-50 p-2.5 dark:border-neutral-700 dark:bg-neutral-800"
            autoComplete="off"
          />
          <button className="min-h-[46px] rounded-xl bg-violet-600 font-bold text-white">Save</button>
        </form>
      )}

      <div className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => camRef.current?.click()}
            className="min-h-[52px] flex-1 basis-36 rounded-xl bg-violet-600 px-4 font-bold text-white disabled:opacity-45"
          >
            📷 Take photo
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => fileRef.current?.click()}
            className="min-h-[52px] flex-1 basis-36 rounded-xl bg-neutral-100 px-4 font-bold dark:bg-neutral-800 disabled:opacity-45"
          >
            🎞 Photo or video
          </button>
        </div>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          One part, close up, good light. Videos up to 2 minutes.
        </p>
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {busy && (
        <div className="flex items-center gap-2.5 font-semibold text-neutral-500" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-600" />
          {busy === "reading" ? "Reading the file…" : "Checking… usually 5–15 seconds"}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
          {frames.length > 0 && !busy && (
            <button type="button" onClick={() => check(frames, kind)} className="ml-2 underline">
              Try again
            </button>
          )}
        </div>
      )}

      {frames.length > 0 && !result && kind === "frames" && (
        <div className="flex gap-1.5 overflow-x-auto">
          {frames.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={f.url} alt={`Frame ${i}`} className="h-[54px] w-[72px] flex-none rounded-lg object-cover" />
          ))}
        </div>
      )}
      {frames.length > 0 && !result && kind === "image" && <Boxed frame={frames[0]} findings={[]} index={[]} />}

      {result && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
          {!result.photoOk && (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <strong>Retake:</strong> {result.retakeReason || "the photo is not clear enough."}
            </div>
          )}

          {(shown.length ? shown : [{ fi: 0, list: [] }]).map(({ fi, list }) => (
            <div key={fi} className="flex flex-col gap-1">
              <Boxed
                frame={frames[fi] ?? frames[0]}
                findings={list.map((x) => x.f)}
                index={list.map((x) => x.i)}
              />
              {kind === "frames" && list.length > 0 && (
                <p className="text-xs text-neutral-500">At {frames[fi] ? list[0].f.time : ""} in the video</p>
              )}
            </div>
          ))}

          {result.view && <p className="text-sm text-neutral-600 dark:text-neutral-300">{result.view}</p>}

          {result.findings.length === 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              Could not tell which part this is. Take a closer photo of one part.
            </div>
          )}

          {result.findings.map((f, i) => {
            const leaf = f.part.split(" > ").pop();
            const r = ratings[i];
            return (
              <div key={i} className="flex flex-col gap-1.5 border-t border-neutral-200 pt-3 first-of-type:border-0 dark:border-neutral-800">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#FF4D57] text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">{f.part}</p>
                    <p className="font-bold">{leaf}</p>
                    <p className="text-[22px] font-extrabold leading-tight">{f.issue}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.severity && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SEV[f.severity]}`}>{f.severity}</span>
                  )}
                  {f.action && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {f.action}
                    </span>
                  )}
                  {f.structural && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SEV.Major}`}>Structural</span>}
                  {!f.inList && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SEV.Minor}`}>Check list</span>}
                </div>
                <div className="flex items-center gap-2.5 font-mono text-[13px] text-neutral-500">
                  <span>Sure</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                    <i className="block h-full bg-violet-600" style={{ width: `${f.confidence}%` }} />
                  </span>
                  <span>{f.confidence}%</span>
                </div>
                <p>{f.reason}</p>

                {r?.state === "open" && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => rate(i, true, f.issue)} className="min-h-[42px] flex-1 rounded-xl bg-neutral-100 text-sm font-bold dark:bg-neutral-800">
                      ✓ Right
                    </button>
                    <button
                      type="button"
                      onClick={() => setRatings((rs) => rs.map((x, j) => (j === i ? { state: "fixing" } : x)))}
                      className="min-h-[42px] flex-1 rounded-xl bg-neutral-100 text-sm font-bold dark:bg-neutral-800"
                    >
                      ✗ Wrong
                    </button>
                  </div>
                )}
                {r?.state === "fixing" && (
                  <select
                    aria-label="Correct issue"
                    defaultValue=""
                    onChange={(e) => {
                      const label = e.target.options[e.target.selectedIndex].text;
                      if (e.target.value) rate(i, false, label);
                    }}
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-2.5 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <option value="">Pick the right issue…</option>
                    <option value="0">No issue</option>
                    {f.options.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                    <option value="-1">Wrong part identified</option>
                  </select>
                )}
                {r?.state === "saved" && <p className="text-xs text-neutral-500">Saved: {r.label}</p>}
              </div>
            );
          })}

          {result.alsoCheck && (
            <p className="text-[13px] text-neutral-500">
              <strong>Also check:</strong> {result.alsoCheck}
            </p>
          )}
          <p className="text-xs text-neutral-500">Answered in {result.secs} s. You decide what to mark.</p>
          <div className="flex flex-wrap gap-2">
            {result.findings.length > 0 && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(seniorText)}`}
                className="grid min-h-[52px] flex-1 basis-36 place-items-center rounded-xl bg-neutral-100 px-4 text-center font-bold dark:bg-neutral-800"
              >
                Ask a senior on WhatsApp
              </a>
            )}
            <button type="button" onClick={next} className="min-h-[52px] flex-1 basis-36 rounded-xl bg-violet-600 px-4 font-bold text-white">
              Next photo
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 text-[13px] text-neutral-500">
        <div>
          <strong className="block text-lg text-neutral-900 dark:text-neutral-100">{session.rated}</strong>rated
        </div>
        <div>
          <strong className="block text-lg text-neutral-900 dark:text-neutral-100">
            {session.rated ? `${Math.round((session.right / session.rated) * 100)}%` : "–"}
          </strong>
          right
        </div>
        <div>
          <strong className="block text-lg text-neutral-900 dark:text-neutral-100">{avg}</strong>avg time
        </div>
        {overall && overall.rated > 0 && (
          <div>
            <strong className="block text-lg text-neutral-900 dark:text-neutral-100">
              {Math.round((overall.right / overall.rated) * 100)}%
            </strong>
            right, all ({overall.rated})
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-400">
        Photos are sent to an AI provider for checking. Use test photos without number plates or faces.
      </p>
    </div>
  );
}
