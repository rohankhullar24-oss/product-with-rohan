import type { Metadata } from "next";
import Link from "next/link";
import InspectorCopilot from "./InspectorCopilot";
import { BRAND } from "@/lib/inspector/prompt";

export const metadata: Metadata = {
  title: "CarBecho Inspection Co-Pilot",
  description:
    "A hands-free voice assistant for field inspectors running a 200-point used-car inspection. Speak the fault, hear the call.",
  // Unlisted: reachable by direct link only, not in the sitemap or nav.
  robots: { index: false, follow: false },
};

const STEPS: { title: string; body: string }[] = [
  {
    title: "1 · Pick the job, verify, pair",
    body:
      "Two jobs sit in the day's list — one Manual, one with Copilot pre-fills. Scan the RC, pair the OBD dongle, and the timer starts against a 60-minute baseline.",
  },
  {
    title: "2 · Work the 200-point checklist",
    body:
      "Eight sections, forty grouped checks. A Copilot job arrives with photo-AI, OBD and VAHAN pre-fills the inspector accepts or overrides; a Manual job is entered by hand.",
  },
  {
    title: "3 · Ask the Co-Pilot from any row",
    body:
      "Every checklist row has a 💬 Ask button. It opens the chat with that row already loaded as context, so the answer is about the thing the inspector is standing in front of.",
  },
  {
    title: "4 · Mark the row from the answer",
    body:
      "When the reply lands on a checklist item, the chat offers a one-tap Mark No · severity or Mark Yes. The row fills in, tagged 💬 via chat, and the reasoning is kept with it.",
  },
  {
    title: "5 · Report and trail",
    body:
      "The report totals the score, splits defects by severity for the pricing engine, and shows how many rows came from pre-fills versus chat. Every exchange also lands in the shared findings log.",
  },
];

const INPUTS: { label: string; body: string }[] = [
  { label: "Type only", body: "Ask a question in the box and send." },
  { label: "Speak only", body: "Tap the mic, talk, pause — it sends itself after 2.5s of silence." },
  { label: "Photo only", body: "Attach a photo with no words; the assistant is asked what it sees." },
  { label: "Photo + typing", body: "Attach, then type what the photo does not show." },
  {
    label: "Photo + speech",
    body:
      "With a photo staged, the mic transcribes into the box instead of auto-sending — so words and picture go together on one tap.",
  },
  {
    label: "Speech, then edit",
    body: "Dictate, correct a word by hand, then send. The mic appends to whatever is already typed.",
  },
];

export default function InspectorPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-5 pt-10 sm:pt-14">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 dark:border-violet-900/60 dark:bg-violet-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            New · Interactive inspection flow
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            The whole inspection, with the Co-Pilot in the chat
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            The tool below is voice-first: one question, one spoken answer. But on a real inspection the
            seller keeps asking, and the inspector keeps needing to look something up mid-check. So the
            assistant now lives inside the job itself — as a chat on every checklist row, where an answer can
            be read back, scrolled, and turned into a mark.
          </p>
          <Link
            href="/carbecho"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Open the {BRAND} inspection flow →
          </Link>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Demo job data · a real Gemini-backed assistant · best on a phone-width window.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">How the flow works</h3>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step) => (
              <li key={step.title} className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Every way to ask
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Text, voice and photo are three inputs on one composer, and any combination of them is a valid
            message.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {INPUTS.map((input) => (
              <div
                key={input.label}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <dt className="text-sm font-semibold">{input.label}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{input.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Language and voice are the inspector&apos;s call
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>
              <b className="text-slate-800 dark:text-slate-100">Reply language:</b> Hinglish or English,
              switchable mid-conversation. The toggle is sent with the request and pins the reply language —
              asking the model to &ldquo;mirror the inspector&rdquo; was not reliable.
            </li>
            <li>
              <b className="text-slate-800 dark:text-slate-100">Voice out:</b> on by default, one tap to mute.
              The same choice drives the text in the bubble and the speech, so a noisy forecourt or a quiet
              showroom both work.
            </li>
            <li>
              <b className="text-slate-800 dark:text-slate-100">Voice in:</b> the mic keeps listening through
              pauses and only submits after real silence, because inspectors think mid-sentence.
            </li>
            <li>
              <b className="text-slate-800 dark:text-slate-100">Guardrail:</b> the assistant never invents a
              defect code, a star rating or a repair price — those come from the rules engine. It says what to
              log instead.
            </li>
          </ul>
        </div>

        <hr className="mt-10 border-slate-200 dark:border-slate-700" />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          The original voice-only tool
        </p>
      </section>
      <InspectorCopilot />
    </>
  );
}
