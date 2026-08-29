"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_ONLY_PROMPT } from "@/lib/inspector/prompt";
import { C, resolveChecklistItem, type ItemRef } from "@/lib/inspector/flow";

/* ------------------------------------------------------------------ types */

export type ChatContext = { sectionName: string; item: string; ref: ItemRef } | null;

export type MarkRequest = {
  ref: ItemRef;
  verdict: "pass" | "fail";
  severity?: string;
  note: string;
};

type Turn = { role: "user" | "model"; text: string };

type Photo = { previewUrl: string; mimeType: string; base64: string; thumb: string };

type Reply = { section: string; item: string; severity: string; action: string };

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  photo?: string;
  spoken?: boolean;
  context?: string;
  reply?: Reply;
  target?: ItemRef | null;
  marked?: "pass" | "fail";
  error?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  context: ChatContext;
  onClearContext: () => void;
  onMark: (request: MarkRequest) => void;
  accent: string;
};

/* -------------------------------------------------------------- constants */

const LANGS = [
  { code: "hi-IN", label: "Hinglish" },
  { code: "en-IN", label: "English" },
] as const;

const MAX_IMAGE_EDGE = 1280;
const THUMB_EDGE = 160;
const SILENCE_MS = 2500;
const MAX_TURNS = 12;

const QUICK: Record<string, string[]> = {
  "hi-IN": [
    "Is item me kya kya dekhna hai?",
    "Ye photo dekh ke batao kya issue hai",
    "Isko Minor mark karun ya Major?",
  ],
  "en-IN": [
    "What exactly should I check for this item?",
    "Look at this photo and tell me the issue",
    "Should I mark this Minor or Major?",
  ],
};

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

/* ------------------------------------------------------------- component */

export default function InspectionChat({
  open,
  onClose,
  context,
  onClearContext,
  onMark,
  accent,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typed, setTyped] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [lang, setLang] = useState<string>("hi-IN");
  const [speakReplies, setSpeakReplies] = useState(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);

  // Refs shadow the state the speech callbacks read, because the recognition
  // object is created once and would otherwise close over the first render.
  const langRef = useRef(lang);
  const photoRef = useRef<Photo | null>(null);
  const contextRef = useRef<ChatContext>(context);
  const busyRef = useRef(false);
  const listeningRef = useRef(false);
  const finalRef = useRef("");
  const submittingRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(text: string, spoken: boolean) => void>(() => {});

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    });
  }, [messages, open]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langRef.current;
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((voice) => voice.lang === langRef.current) ??
        voices.find((voice) => voice.lang?.startsWith(langRef.current.slice(0, 2)));
      if (match) utterance.voice = match;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  /* ------------------------------------------------------------ sending */

  const send = useCallback(
    async (rawText: string, spoken: boolean) => {
      const attached = photoRef.current;
      const text = rawText.trim();
      if ((!text && !attached) || busyRef.current) return;

      const active = contextRef.current;
      const question = text || PHOTO_ONLY_PROMPT;

      busyRef.current = true;
      setBusy(true);
      setError("");
      setTyped("");
      setPhoto(null);

      setMessages((previous) => [
        ...previous,
        {
          id: `u${Date.now()}`,
          role: "user",
          text: question,
          photo: attached?.previewUrl,
          spoken,
          context: active ? `${active.sectionName} › ${active.item}` : undefined,
        },
      ]);

      // The checklist row the inspector is standing on is worth more to the
      // model than anything they can type, so it rides in front of the question
      // and is what the Mark button binds to when it comes back.
      const framed = [
        active ? `[Currently on checklist item "${active.item}" in section "${active.sectionName}"]` : "",
        question,
        attached ? "[inspector attached a photo]" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const withQuestion: Turn[] = [...turnsRef.current, { role: "user", text: framed }];
      turnsRef.current = withQuestion.slice(-MAX_TURNS);

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
        // A gateway or a deploy in flight answers with HTML, not JSON. Parsing
        // that straight into the chat showed the inspector a raw parser error.
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          throw new Error(
            data?.error || `The co-pilot could not answer right now (${response.status}).`
          );
        }

        const reply: Reply = {
          section: data.section ?? "",
          item: data.item ?? "",
          severity: data.severity ?? "",
          action: data.action ?? "",
        };
        const say: string = data.say ?? "";

        const withAnswer: Turn[] = [...turnsRef.current, { role: "model", text: say }];
        turnsRef.current = withAnswer.slice(-MAX_TURNS);

        // Bind the answer to a row: the open context wins, otherwise fall back
        // to matching the model's own section/item guess against the checklist.
        const target = active ? active.ref : resolveChecklistItem(reply.section, reply.item);

        setMessages((previous) => [
          ...previous,
          { id: `b${Date.now()}`, role: "bot", text: say, reply, target },
        ]);

        if (speakReplies) speak(say);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Something went wrong.";
        setError(message);
        setMessages((previous) => [
          ...previous,
          { id: `e${Date.now()}`, role: "bot", text: message, error: true },
        ]);
        if (speakReplies) speak(message);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [speak, speakReplies]
  );

  useEffect(() => {
    sendRef.current = (text: string, spoken: boolean) => void send(text, spoken);
  }, [send]);

  /* -------------------------------------------------------------- speech */

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Impl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Impl) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new Impl();
    // continuous: the inspector thinks mid-sentence. Chrome's default ends the
    // utterance on the first short silence, which cuts them off.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const clearSilence = () => {
      if (silenceRef.current) {
        clearTimeout(silenceRef.current);
        silenceRef.current = null;
      }
    };

    const armSilence = () => {
      clearSilence();
      silenceRef.current = setTimeout(() => {
        const spokenText = finalRef.current.trim();
        if (!spokenText || submittingRef.current) return;
        // A staged photo means the inspector is still composing - hold the
        // transcript in the box so they can send words and picture together.
        if (photoRef.current) return;
        submittingRef.current = true;
        listeningRef.current = false;
        setListening(false);
        try {
          recognition.stop();
        } catch {
          /* noop */
        }
        sendRef.current(spokenText, true);
      }, SILENCE_MS);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTyped((finalRef.current + interim).trim());
      armSilence();
    };

    recognition.onspeechstart = () => clearSilence();

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return; // a pause, not a failure
      clearSilence();
      listeningRef.current = false;
      setListening(false);
      setError(
        event.error === "not-allowed"
          ? "Microphone permission is blocked. Allow it in the browser address bar."
          : "The mic stopped unexpectedly. Tap the mic to try again."
      );
    };

    // Chrome ends the session on its own after a stretch of quiet even in
    // continuous mode. If the inspector is still mid-thought, start it again.
    recognition.onend = () => {
      if (submittingRef.current || busyRef.current || !listeningRef.current) return;
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      clearSilence();
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

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggleMic = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listeningRef.current) {
      listeningRef.current = false;
      setListening(false);
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      return;
    }
    finalRef.current = typed ? `${typed} ` : "";
    submittingRef.current = false;
    listeningRef.current = true;
    setError("");
    try {
      recognition.lang = langRef.current;
      recognition.start();
      setListening(true);
    } catch {
      /* already running */
    }
  }, [typed]);

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

  const applyMark = (message: Message, verdict: "pass" | "fail") => {
    if (!message.target) return;
    onMark({
      ref: message.target,
      verdict,
      severity: verdict === "fail" ? message.reply?.severity || "Minor" : undefined,
      note: message.text.slice(0, 160),
    });
    setMessages((previous) =>
      previous.map((entry) => (entry.id === message.id ? { ...entry, marked: verdict } : entry))
    );
  };

  /* ----------------------------------------------------------------- ui */

  const toggle = (on: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${on ? accent : C.line}`,
        background: on ? accent : "#fff",
        color: on ? "#fff" : C.sub,
        borderRadius: 999,
        padding: "5px 11px",
        fontSize: 11,
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(23,18,33,.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .22s",
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${open ? "0" : "102%"})`,
          width: "100%",
          maxWidth: 430,
          height: "82vh",
          background: C.bg,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(23,18,33,.25)",
          transition: "transform .26s cubic-bezier(.32,.72,0,1)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{ background: accent, color: "#fff", padding: "12px 14px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>
                Ask the Co-Pilot
              </div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Type · speak · snap a photo</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,.18)", border: "none", color: "#fff", borderRadius: 10, width: 30, height: 30, fontSize: 15, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {context && (
            <div
              style={{
                marginTop: 9,
                background: "rgba(255,255,255,.16)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 11.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ flex: 1, lineHeight: 1.35 }}>
                On: <b>{context.sectionName}</b> › {context.item}
              </span>
              <button
                onClick={onClearContext}
                style={{ background: "none", border: "none", color: "#fff", opacity: 0.75, fontSize: 11, fontWeight: 800, cursor: "pointer" }}
              >
                clear
              </button>
            </div>
          )}
        </div>

        {/* settings strip */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "9px 12px",
            background: C.card,
            borderBottom: `1px solid ${C.line}`,
            overflowX: "auto",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.sub, letterSpacing: 0.6 }}>REPLY IN</span>
          {LANGS.map((option) => (
            <span key={option.code}>
              {toggle(lang === option.code, option.label, () => setLang(option.code))}
            </span>
          ))}
          <span style={{ width: 1, height: 18, background: C.line, margin: "0 3px" }} />
          {toggle(speakReplies, speakReplies ? "🔊 Voice on" : "🔇 Voice off", () => {
            if (speakReplies) window.speechSynthesis?.cancel();
            setSpeakReplies(!speakReplies);
          })}
        </div>

        {/* transcript */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 12px 6px" }}>
          {messages.length === 0 && (
            <div style={{ padding: "6px 2px 12px" }}>
              <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>
                Ask anything mid-inspection. Type it, hold the mic and say it, attach a photo — or any
                combination. The answer comes back in chat, and if it lands on a checklist row you get a
                one-tap button to mark it.
              </div>
              {(QUICK[lang] ?? QUICK["hi-IN"]).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setTyped(prompt)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: C.card,
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    padding: "9px 12px",
                    fontSize: 12.5,
                    color: C.ink,
                    marginBottom: 7,
                    cursor: "pointer",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <div style={{ maxWidth: "82%" }}>
                  {message.context && (
                    <div style={{ fontSize: 9.5, color: C.sub, fontWeight: 700, textAlign: "right", marginBottom: 3 }}>
                      {message.context}
                    </div>
                  )}
                  <div style={{ background: accent, color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "9px 12px", fontSize: 13, lineHeight: 1.5 }}>
                    {message.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.photo}
                        alt="Inspector photo"
                        style={{ width: "100%", borderRadius: 9, marginBottom: 7, display: "block" }}
                      />
                    )}
                    {message.text}
                    {message.spoken && (
                      <div style={{ fontSize: 9.5, opacity: 0.8, fontWeight: 700, marginTop: 4 }}>🎙 spoken</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={message.id} style={{ marginBottom: 12, maxWidth: "88%" }}>
                <div
                  style={{
                    background: message.error ? C.failBg : C.card,
                    border: `1px solid ${message.error ? "#F5C2CE" : C.line}`,
                    borderRadius: "14px 14px 14px 4px",
                    padding: "10px 12px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: message.error ? "#8C1128" : C.ink,
                  }}
                >
                  {message.text}
                </div>

                {message.reply && (message.reply.section || message.reply.action) && (
                  <div style={{ background: C.aiBg, borderRadius: 12, padding: "8px 11px", marginTop: 6, fontSize: 11.5, color: C.purpleDark, lineHeight: 1.5 }}>
                    {message.reply.section && (
                      <div>
                        <b>{message.reply.section}</b>
                        {message.reply.item ? ` · ${message.reply.item}` : ""}
                        {message.reply.severity ? ` · ${message.reply.severity}` : ""}
                      </div>
                    )}
                    {message.reply.action && <div style={{ marginTop: 3 }}>→ {message.reply.action}</div>}
                  </div>
                )}

                {message.target && !message.marked && (
                  <div style={{ marginTop: 7 }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700, marginBottom: 5 }}>
                      Apply to “{message.target.label}”
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => applyMark(message, "fail")}
                        style={{ flex: 1, background: C.fail, color: "#fff", border: "none", borderRadius: 10, padding: "8px 0", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                      >
                        ✕ Mark Fail · {message.reply?.severity || "Minor"}
                      </button>
                      <button
                        onClick={() => applyMark(message, "pass")}
                        style={{ flex: 1, background: "#fff", color: C.pass, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 0", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                      >
                        ✓ Mark Pass
                      </button>
                    </div>
                  </div>
                )}

                {message.marked && (
                  <div style={{ marginTop: 7, fontSize: 11, fontWeight: 800, color: message.marked === "fail" ? C.fail : C.pass }}>
                    {message.marked === "fail" ? "✕" : "✓"} “{message.target?.label}” marked from chat
                  </div>
                )}
              </div>
            )
          )}

          {busy && (
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, padding: "2px 4px 8px" }}>
              Co-Pilot is thinking…
            </div>
          )}
        </div>

        {/* composer */}
        <div style={{ borderTop: `1px solid ${C.line}`, background: C.card, padding: "9px 10px 12px" }}>
          {photo && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumb} alt="Attached" style={{ width: 42, height: 42, borderRadius: 9, objectFit: "cover" }} />
              <span style={{ flex: 1, fontSize: 11.5, color: C.sub, fontWeight: 600 }}>
                Photo attached — add words or send it on its own.
              </span>
              <button
                onClick={() => setPhoto(null)}
                style={{ background: C.naBg, border: "none", color: C.sub, borderRadius: 8, padding: "5px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          )}

          {listening && (
            <div style={{ fontSize: 11, color: accent, fontWeight: 800, marginBottom: 6 }}>
              ● Listening — {photo ? "photo staged, tap send when done" : "pause when you're done"}
            </div>
          )}

          {error && !listening && (
            <div style={{ fontSize: 11, color: C.fail, fontWeight: 700, marginBottom: 6 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoChosen}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo"
              style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", fontSize: 17, cursor: "pointer", flexShrink: 0 }}
            >
              📷
            </button>
            <button
              onClick={toggleMic}
              disabled={!speechSupported}
              aria-label="Speak"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1.5px solid ${listening ? "transparent" : C.line}`,
                background: listening ? C.fail : "#fff",
                opacity: speechSupported ? 1 : 0.4,
                fontSize: 17,
                cursor: speechSupported ? "pointer" : "not-allowed",
                flexShrink: 0,
              }}
            >
              🎙
            </button>
            <textarea
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(typed, false);
                }
              }}
              rows={1}
              placeholder={lang === "en-IN" ? "Type your question…" : "Sawaal type kijiye…"}
              style={{
                flex: 1,
                resize: "none",
                border: `1.5px solid ${C.line}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                color: C.ink,
                outline: "none",
                maxHeight: 90,
              }}
            />
            <button
              onClick={() => void send(typed, false)}
              disabled={busy || (!typed.trim() && !photo)}
              style={{
                height: 40,
                padding: "0 15px",
                borderRadius: 12,
                border: "none",
                background: accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                opacity: busy || (!typed.trim() && !photo) ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>

          {!speechSupported && (
            <div style={{ fontSize: 10.5, color: C.sub, marginTop: 6 }}>
              This browser has no speech recognition — use Chrome or Edge for voice. Typing and photos work
              everywhere.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
