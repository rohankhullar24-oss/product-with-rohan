"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { RazorpayFailureResponse, RazorpayPaymentResponse } from "@/types/razorpay";
import {
  ATTIRE,
  PASSPORT_PHOTO_PRICE_INR as PRICE,
  PRESETS,
  type Attire,
  type Crop,
  type PresetId,
} from "@/lib/passport-photo/presets";

type Job = { token: string; preview: string; width: number; height: number };
type Files = { photo: string; photoKB: number; sheet: string };
/** Box position as fractions of the image; height follows from the preset's aspect. */
type Box = { x: number; y: number; w: number };

// Where the head should sit inside the photo, as fractions of the photo itself.
// India: chin-to-crown 32–36 mm of 45 mm. US: head 1–1⅜ in of 2 in.
const HEAD_GUIDE: Record<PresetId, { cy: number; h: number; w: number }> = {
  india: { cy: 0.47, h: 0.74, w: 0.6 },
  us: { cy: 0.46, h: 0.6, w: 0.44 },
};

// A paid job survives a refresh; the token itself expires server-side after 24 h.
const STASH = "passport-photo:paid";

/** Height fraction per width fraction for this preset on this image. */
function ratio(job: Job, preset: PresetId) {
  const p = PRESETS[preset];
  return (job.width / job.height) * (p.height / p.width);
}

function maxW(job: Job, preset: PresetId) {
  return Math.min(1, 1 / ratio(job, preset));
}

function clampBox(b: Box, job: Job, preset: PresetId): Box {
  const w = Math.min(maxW(job, preset), Math.max(0.2, b.w));
  const h = w * ratio(job, preset);
  return { w, x: Math.min(1 - w, Math.max(0, b.x)), y: Math.min(1 - h, Math.max(0, b.y)) };
}

function defaultBox(job: Job, preset: PresetId): Box {
  const w = maxW(job, preset) * 0.92;
  return clampBox({ w, x: (1 - w) / 2, y: 0.02 }, job, preset);
}

function toCrop(b: Box, job: Job, preset: PresetId): Crop {
  return { x: b.x, y: b.y, w: b.w, h: b.w * ratio(job, preset) };
}

async function downscale(file: File): Promise<{ mime: string; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const el = new Image();
      el.onload = () => ok(el);
      el.onerror = () => fail(new Error("Couldn't read that image. Try a JPEG or PNG."));
      el.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { mime: "image/jpeg", data: canvas.toDataURL("image/jpeg", 0.9).split(",")[1] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function save(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export default function PassportPhoto() {
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; box: Box } | null>(null);

  const [attire, setAttire] = useState<Attire>("none");
  const [preset, setPreset] = useState<PresetId>("india");
  const [job, setJob] = useState<Job | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [busy, setBusy] = useState<"" | "processing" | "paying" | "building">("");
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<RazorpayPaymentResponse | null>(null);
  const [files, setFiles] = useState<Files | null>(null);

  // Restore a paid photo after a refresh, so nobody pays twice for one job.
  useEffect(() => {
    let saved: { job: Job; payment: RazorpayPaymentResponse; preset: PresetId; box: Box } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STASH) ?? "null");
    } catch {}
    if (!saved?.job?.token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJob(saved.job);
    setPayment(saved.payment);
    setPreset(saved.preset);
    setBox(saved.box);
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setFiles(null);
    setPayment(null);
    setBusy("processing");
    track("passport_photo_upload", { attire });
    try {
      const selfie = await downscale(file);
      const res = await fetch("/api/passport-photo/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selfie, attire }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error ?? "Something went wrong. Try again.");
      const next: Job = { token: data.token, preview: data.preview, width: data.width, height: data.height };
      setJob(next);
      setBox(defaultBox(next, preset));
      track("passport_photo_preview", { attire });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function changePreset(next: PresetId) {
    setPreset(next);
    setFiles(null);
    if (job) setBox(defaultBox(job, next));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!box) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, box };
  }

  function onPointerMove(e: React.PointerEvent) {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!drag.current || !frame || !job) return;
    const { px, py, box: start } = drag.current;
    setFiles(null);
    setBox(
      clampBox(
        { ...start, x: start.x + (e.clientX - px) / frame.width, y: start.y + (e.clientY - py) / frame.height },
        job,
        preset
      )
    );
  }

  function onZoom(value: number) {
    if (!job || !box) return;
    const h = box.w * ratio(job, preset);
    const w = maxW(job, preset) * value;
    const nh = w * ratio(job, preset);
    setFiles(null);
    setBox(clampBox({ w, x: box.x + (box.w - w) / 2, y: box.y + (h - nh) / 2 }, job, preset));
  }

  async function build(pay: RazorpayPaymentResponse, forJob: Job, forBox: Box) {
    setBusy("building");
    setError("");
    try {
      const res = await fetch("/api/passport-photo/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pay, token: forJob.token, preset, crop: toCrop(forBox, forJob, preset) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.photo) throw new Error(data.error ?? "Couldn't build your files. Try again.");
      setFiles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build your files. Try again.");
    } finally {
      setBusy("");
    }
  }

  async function pay() {
    if (!job || !box) return;
    setError("");
    setBusy("paying");
    track("passport_photo_checkout_started", { amount: PRICE });
    try {
      const res = await fetch("/api/passport-photo/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: job.token }),
      });
      const order = await res.json().catch(() => ({}));
      if (!res.ok || !order.order_id) throw new Error(order.error ?? "Couldn't start payment. Try again.");
      if (typeof window.Razorpay !== "function") throw new Error("Payment could not load. Refresh and try again.");

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount: order.amount,
        currency: order.currency,
        name: "AI Passport Photo",
        description: "Passport photo + 6 × 4 in print sheet",
        order_id: order.order_id,
        theme: { color: "#0d9488" },
        handler: (response) => {
          track("passport_photo_payment_succeeded", { amount: PRICE });
          setPayment(response);
          try {
            sessionStorage.setItem(STASH, JSON.stringify({ job, payment: response, preset, box }));
          } catch {}
          build(response, job, box);
        },
        modal: { ondismiss: () => setBusy("") },
      });
      rzp.on("payment.failed", (response: RazorpayFailureResponse) => {
        track("passport_photo_payment_failed", { amount: PRICE });
        setError(response.error?.description || "Payment failed. Please try again.");
        setBusy("");
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy("");
    }
  }

  function startOver() {
    try {
      sessionStorage.removeItem(STASH);
    } catch {}
    setJob(null);
    setBox(null);
    setPayment(null);
    setFiles(null);
    setError("");
  }

  const p = PRESETS[preset];
  const guide = HEAD_GUIDE[preset];
  const h = job && box ? box.w * ratio(job, preset) : 0;
  const zoom = job && box ? box.w / maxW(job, preset) : 1;

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      {!job && (
        <>
          <h2 className="font-semibold">1. Choose what to wear</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {ATTIRE.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAttire(a.id)}
                className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                  attire === a.id
                    ? "border-teal-600 bg-teal-50 dark:bg-teal-950/40"
                    : "border-slate-200 hover:border-slate-400 dark:border-slate-700"
                }`}
              >
                <span className="block font-medium">{a.label}</span>
                <span className="mt-1 block text-slate-500 dark:text-slate-400">{a.hint}</span>
              </button>
            ))}
          </div>

          <h2 className="mt-6 font-semibold">2. Upload a selfie</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
            <li>Face the camera straight on, eyes open, mouth closed.</li>
            <li>Good light on your face, no cap or sunglasses.</li>
            <li>Include your shoulders. Any background is fine.</li>
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={!!busy}
            onClick={() => fileRef.current?.click()}
            className="mt-4 w-full rounded-full bg-teal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            {busy === "processing" ? "Making your passport photo… (about 15 s)" : "Upload or take a selfie"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">Free preview. Pay ₹{PRICE} only to download.</p>
        </>
      )}

      {job && box && (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.values(PRESETS).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => changePreset(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  preset === option.id
                    ? "border-teal-600 bg-teal-50 font-medium dark:bg-teal-950/40"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {option.label} · {option.size}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Drag the frame and use the slider so your head fills the dashed oval.
          </p>
          <div
            ref={frameRef}
            className="relative mx-auto mt-3 max-w-sm touch-none select-none overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL preview, nothing to optimise */}
            <img src={job.preview} alt="Your passport photo preview" className="block w-full" draggable={false} />
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              className="absolute cursor-move border-2 border-teal-500"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${h * 100}%`,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
              }}
            >
              <div
                className="pointer-events-none absolute rounded-[50%] border-2 border-dashed border-white/90"
                style={{
                  left: `${(1 - guide.w) * 50}%`,
                  width: `${guide.w * 100}%`,
                  top: `${(guide.cy - guide.h / 2) * 100}%`,
                  height: `${guide.h * 100}%`,
                }}
              />
            </div>
          </div>
          <label className="mx-auto mt-4 flex max-w-sm items-center gap-3 text-sm">
            <span className="text-slate-500">Zoom</span>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoom(Number(e.target.value))}
              className="flex-1 accent-teal-600"
            />
          </label>

          {!payment && (
            <button
              type="button"
              onClick={pay}
              disabled={!!busy}
              className="mt-5 w-full rounded-full bg-teal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {busy === "paying" ? "Opening payment…" : `Pay ₹${PRICE} & download`}
            </button>
          )}

          {payment && !files && (
            <button
              type="button"
              onClick={() => build(payment, job, box)}
              disabled={!!busy}
              className="mt-5 w-full rounded-full bg-teal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {busy === "building" ? "Building your files…" : "Build my files"}
            </button>
          )}

          {files && (
            <div className="mt-5 rounded-xl bg-teal-50 p-4 dark:bg-teal-950/40">
              <p className="text-sm font-medium">
                Ready: {p.width} × {p.height} px, 300 DPI, {files.photoKB} KB
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => save(files.photo, `passport-photo-${preset}.jpg`)}
                  className="rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Download photo (upload)
                </button>
                <button
                  type="button"
                  onClick={() => save(files.sheet, `passport-photo-${preset}-print-6x4.jpg`)}
                  className="rounded-full border border-teal-600 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40"
                >
                  Download 6 × 4 print sheet
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Moved the frame or switched size? Your payment covers this photo, so just build again.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={startOver}
            disabled={!!busy}
            className="mt-4 w-full text-sm text-slate-500 underline-offset-2 hover:underline"
          >
            {payment ? "Make another photo" : "Use a different selfie"}
          </button>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
