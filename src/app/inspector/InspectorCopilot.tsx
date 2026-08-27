"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND, PHOTO_ONLY_PROMPT, STARTER_PROMPTS } from "@/lib/inspector/prompt";

type Photo = { previewUrl: string; mimeType: string; base64: string; thumb: string };

type Finding = {
  id: string;
  question: string;
  photoUrl: string;
  say: string;
  section: string;
  item: string;
  severity: string;
  action: string;
  saved: boolean;
};

type Turn = { role: "user" | "model"; text: string };

type Status = "idle" | "listening" | "thinking" | "speaking";

const LANGS = [
  { code: "hi-IN", label: "Hinglish" },
  { code: "en-IN", label: "English" },
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  Major: "bg-amber-100 text-amber-900 border-amber-200",
  Minor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_COPY: Record<Status, string> = {
  idle: "Tap the mic and describe the fault",
  listening: "Listening — pause when you're done",
  thinking: "Checking the checklist…",
  speaking: "Answering…",
};

const MAX_IMAGE_EDGE = 1280;
const THUMB_EDGE = 160;

/** Shrink and re-encode in the browser so a 6MB phone photo doesn't cross the wire. */
async function preparePhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process that photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

  // A separate tiny copy for the shared log, so history stays cheap to store
  // and fast to load however many findings pile up.
  const thumbScale = Math.min(1, THUMB_EDGE / Math.max(canvas.width, canvas.height));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.max(1, Math.round(canvas.width * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(canvas.height * thumbScale));
  thumbCanvas.getContext("2d")?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

  return {
    previewUrl: dataUrl,
    mimeType: "image/jpeg",
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    thumb: thumbCanvas.toDataURL("image/jpeg", 0.6),
  };
}

export default function InspectorCopilot() {
  const [status, setStatus] = useState<Status>("idle");
  const [lang, setLang] = useState<string>("hi-IN");
  const [handsFree, setHandsFree] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [pauseMs, setPauseMs] = useState(2500);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  const photoRef = useRef<Photo | null>(null);
  const handsFreeRef = useRef(false);
  const langRef = useRef("hi-IN");
  const askRef = useRef<(question: string) => void>(() => {});
  const finalRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const pauseMsRef = useRef(2500);
  const listeningRef = useRef(false);
  const findingsRef = useRef<HTMLElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    pauseMsRef.current = pauseMs;
  }, [pauseMs]);

  const speak = useCallback(
    (text: string, onDone: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onDone();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((voice) => voice.lang === lang) ??
        voices.find((voice) => voice.lang?.startsWith(lang.slice(0, 2)));
      if (match) utterance.voice = match;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || busyRef.current) return;
    try {
      setTranscript("");
      setError("");
      finalRef.current = "";
      submittingRef.current = false;
      listeningRef.current = true;
      recognition.lang = lang;
      recognition.start();
      setStatus("listening");
    } catch {
      /* already running */
    }
  }, [lang]);

  const ask = useCallback(
    async (question: string) => {
      const attached = photoRef.current;
      const trimmed = question.trim() || (attached ? PHOTO_ONLY_PROMPT : "");
      if (!trimmed || busyRef.current) return;

      busyRef.current = true;
      listeningRef.current = false;
      setStatus("thinking");
      setError("");
      setTranscript(trimmed);

      const historyText = attached ? `${trimmed} [inspector attached a photo]` : trimmed;
      const withQuestion: Turn[] = [...turnsRef.current, { role: "user", text: historyText }];
      turnsRef.current = withQuestion.slice(-12);

      try {
        const response = await fetch("/api/inspector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turns: turnsRef.current,
            image: attached ? { mimeType: attached.mimeType, data: attached.base64 } : null,
            lang: langRef.current,
            thumb: attached?.thumb ?? null,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "The co-pilot could not answer.");
        }

        const finding: Finding = {
          id: `${Date.now()}`,
          question: trimmed,
          photoUrl: attached?.previewUrl ?? "",
          say: data.say ?? "",
          section: data.section ?? "",
          item: data.item ?? "",
          severity: data.severity ?? "",
          action: data.action ?? "",
          saved: data.saved === true,
        };

        const withAnswer: Turn[] = [...turnsRef.current, { role: "model", text: finding.say }];
        turnsRef.current = withAnswer.slice(-12);
        setFindings((previous) => [finding, ...previous]);
        setPhoto(null);
        // The findings list sits below the fold on a phone; bring it up.
        requestAnimationFrame(() =>
          findingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
        setStatus("speaking");

        speak(finding.say, () => {
          busyRef.current = false;
          setStatus("idle");
          if (handsFreeRef.current) setTimeout(startListening, 350);
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Something went wrong.";
        setError(message);
        // The inspector is under a car and not looking at the screen. Say it.
        setStatus("speaking");
        speak(message, () => {
          busyRef.current = false;
          setStatus("idle");
        });
      }
    },
    [speak, startListening]
  );

  useEffect(() => {
    askRef.current = (question: string) => void ask(question);
  }, [ask]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    // continuous: the inspector thinks mid-sentence. Chrome's default ends the
    // whole utterance on the first short silence, which cut people off.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const clearSilenceTimer = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    // We decide when the sentence is over, not the browser: submit only after
    // pauseMs of true silence following something worth sending.
    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        const spoken = finalRef.current.trim();
        if (!spoken || submittingRef.current) return;
        submittingRef.current = true;
        try {
          recognition.stop();
        } catch {
          /* noop */
        }
        askRef.current(spoken);
      }, pauseMsRef.current);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
      armSilenceTimer();
    };

    recognition.onspeechstart = () => clearSilenceTimer();

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return; // a pause, not a failure
      clearSilenceTimer();
      setStatus("idle");
      if (event.error === "not-allowed") {
        setError("Microphone permission is blocked. Allow it in the browser address bar.");
      } else if (event.error === "aborted") {
        return;
      } else {
        setError("The mic stopped unexpectedly. Tap Speak to try again.");
      }
    };

    // Chrome ends the session on its own after a stretch of silence even in
    // continuous mode. If the inspector is still mid-thought, start it again.
    recognition.onend = () => {
      if (submittingRef.current || busyRef.current || !listeningRef.current) return;
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      clearSilenceTimer();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const onPhotoChosen = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPhoto(await preparePhoto(file));
    } catch {
      setError("Could not read that photo. Try again.");
    }
  }, []);

  const sendNow = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    submittingRef.current = true;
    listeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    const spoken = finalRef.current.trim();
    if (spoken) void ask(spoken);
    else setStatus("idle");
  }, [ask]);

  const stopEverything = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    submittingRef.current = true;
    listeningRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    busyRef.current = false;
    setHandsFree(false);
    setStatus("idle");
  }, []);

  const micLabel = useMemo(() => {
    if (status === "listening") return "Send";
    if (status === "thinking") return "…";
    if (status === "speaking") return "Speaking";
    return "Speak";
  }, [status]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          {BRAND} · Field tool
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Inspection Co-Pilot
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Hands-free help for a 200-point used-car inspection. Snap the part, describe the fault out
          loud in Hinglish or English — it comes back with the section, the severity and what to mark.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => (status === "listening" ? sendNow() : startListening())}
              disabled={!speechSupported || status === "thinking"}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-sm font-semibold text-white transition disabled:opacity-50 ${
                status === "listening"
                  ? "animate-pulse bg-red-600"
                  : "bg-slate-900 hover:bg-slate-700 dark:bg-teal-600 dark:hover:bg-teal-500"
              }`}
            >
              {micLabel}
            </button>
            <div>
              <p className="text-sm font-medium">{STATUS_COPY[status]}</p>
              <p className="text-xs text-slate-500">
                {status === "listening"
                  ? "Take your time — pauses are fine"
                  : handsFree
                    ? "Hands-free on — it keeps listening"
                    : "Tap to talk"}
              </p>
              {status === "listening" && (
                <button
                  type="button"
                  onClick={stopEverything}
                  className="mt-1 text-xs font-medium text-slate-500 underline"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs dark:border-slate-700">
              {LANGS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setLang(option.code)}
                  className={`px-3 py-1.5 font-medium transition ${
                    lang === option.code
                      ? "bg-slate-900 text-white dark:bg-teal-600"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              Pause
              <select
                value={pauseMs}
                onChange={(event) => setPauseMs(Number(event.target.value))}
                className="rounded-md border border-slate-200 bg-transparent px-1.5 py-1 dark:border-slate-700"
              >
                <option value={1500}>1.5s</option>
                <option value={2500}>2.5s</option>
                <option value={4000}>4s</option>
                <option value={6000}>6s</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={handsFree}
                onChange={(event) => setHandsFree(event.target.checked)}
                className="h-3.5 w-3.5 accent-teal-600"
              />
              Hands-free mode
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoChosen}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium transition hover:border-teal-600 hover:text-teal-700 dark:border-slate-700"
          >
            {photo ? "Replace photo" : "Add photo"}
          </button>

          {photo && (
            <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-2 pr-3 dark:border-teal-900 dark:bg-teal-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt="Attached inspection photo"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="text-xs text-teal-900 dark:text-teal-100">
                Attached — ask your question
              </span>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="text-xs font-semibold text-teal-900 underline dark:text-teal-100"
              >
                Remove
              </button>
            </div>
          )}

          {photo && (
            <button
              type="button"
              onClick={() => void ask("")}
              disabled={status === "thinking"}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Just read the photo
            </button>
          )}
        </div>

        {transcript && (
          <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            “{transcript}”
          </p>
        )}

        {!speechSupported && (
          <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This browser has no speech recognition. Use Chrome or Edge for voice — photos and typing
            still work.
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}

        <form
          className="mt-5 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const question = typed;
            setTyped("");
            void ask(question);
          }}
        >
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="…or type the fault"
            className="flex-1 rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={!typed.trim() || status === "thinking"}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-teal-600"
          >
            Ask
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void ask(prompt)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-teal-600 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section ref={findingsRef} className="mt-8 scroll-mt-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Findings this session ({findings.length})
          </h2>
          <Link
            href="/inspector/history"
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            View the full log →
          </Link>
        </div>

        {findings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing logged yet. Every answer lands here so you can copy it into the inspection app.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {findings.map((finding) => (
              <li
                key={finding.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex gap-4">
                  {finding.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={finding.photoUrl}
                      alt="Inspection photo for this finding"
                      className="h-20 w-20 flex-none rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">“{finding.question}”</p>
                    <p className="mt-2 text-sm leading-relaxed">{finding.say}</p>
                  </div>
                </div>

                {(finding.section || finding.severity || finding.item) && (
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

                {!finding.saved && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-500">
                    Not saved to the shared log — this one is only on this screen.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs leading-relaxed text-slate-400">
        Guidance only. Star ratings, defect codes and repair estimates must come from the
        inspection app&apos;s own rules engine, not from this assistant.
      </p>
    </main>
  );
}
