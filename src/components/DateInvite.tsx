"use client";

import { useMemo, useState } from "react";
import { FOOD_OPTIONS, PLAN_OPTIONS, formatDate, formatTime } from "@/lib/date-invite";

type Step = "ask" | "when" | "food" | "confirmed";

const DODGE_LABELS = [
  "Try again",
  "Think harder",
  "Nice try",
  "Not today",
  "Are you sure?",
  "Really sure?",
  "Last chance",
];

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function DateInvite() {
  const [step, setStep] = useState<Step>("ask");
  const [dodgeIndex, setDodgeIndex] = useState(0);
  const [dodgePos, setDodgePos] = useState<{ top: number; left: number } | null>(null);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("18:00");
  const [plan, setPlan] = useState(PLAN_OPTIONS[0]);
  const [food, setFood] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dodge = () => {
    setDodgeIndex((i) => Math.min(i + 1, DODGE_LABELS.length - 1));
    const top = 10 + Math.random() * 65;
    const left = 10 + Math.random() * 65;
    setDodgePos({ top, left });
  };

  const selectedFood = food ?? FOOD_OPTIONS[0].label;

  const confirmDate = () => {
    setStep("confirmed");
    fetch("/api/date-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ date, time, plan, food: selectedFood }),
    }).catch(() => {});
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 px-4 py-16">
      <div className="relative w-full max-w-md rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-rose-100 backdrop-blur">
        {step === "ask" && (
          <div className="relative">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-rose-400">
              A small question
            </p>
            <h1 className="mt-3 text-center text-3xl font-bold leading-tight text-rose-900">
              Will you go on
              <br />a date with me?
            </h1>
            <p className="mt-3 text-center text-sm text-rose-500">
              Take your time. There is really only one right answer here.
            </p>

            <div className="mx-auto mt-6 w-fit rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-400">
                Me waiting for you
              </p>
              <p className="my-2 text-5xl">🐱</p>
              <p className="text-xs font-bold uppercase tracking-wide text-rose-400">
                to press yes
              </p>
            </div>

            <div className="relative mt-8 flex h-24 items-center justify-center gap-3">
              <button
                onClick={() => setStep("when")}
                className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
              >
                ❤️ Yes, I&apos;d love to
              </button>
              <button
                onMouseEnter={dodge}
                onClick={dodge}
                style={
                  dodgePos
                    ? {
                        position: "absolute",
                        top: `${dodgePos.top}%`,
                        left: `${dodgePos.left}%`,
                      }
                    : undefined
                }
                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-400 shadow-sm transition-all duration-200"
              >
                {DODGE_LABELS[dodgeIndex]}
              </button>
            </div>
          </div>
        )}

        {step === "when" && (
          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-rose-400">
              Step 1 of 2
            </p>
            <div className="mt-2 text-center text-3xl">📆</div>
            <h1 className="mt-2 text-center text-2xl font-bold text-rose-900">
              When works for you?
            </h1>
            <p className="mt-1 text-center text-sm text-rose-500">
              Pick a date and time — I&apos;ll make it special.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                  Date
                </span>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-full border border-rose-200 bg-white px-4 py-2 text-sm text-rose-900 focus:border-rose-400 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                  Time
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded-full border border-rose-200 bg-white px-4 py-2 text-sm text-rose-900 focus:border-rose-400 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                  The plan
                </span>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="mt-1 w-full rounded-full border border-rose-200 bg-white px-4 py-2 text-sm text-rose-900 focus:border-rose-400 focus:outline-none"
                >
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={() => setStep("food")}
              className="mt-6 w-full rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
            >
              Next: the food →
            </button>
          </div>
        )}

        {step === "food" && (
          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-rose-400">
              Step 2 of 2
            </p>
            <div className="mt-2 text-center text-3xl">🍴</div>
            <h1 className="mt-2 text-center text-2xl font-bold text-rose-900">
              What should we eat?
            </h1>
            <p className="mt-1 text-center text-sm text-rose-500">
              The most important decision of the night. Choose wisely.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {FOOD_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setFood(option.label)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-medium transition ${
                    selectedFood === option.label
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-rose-200 bg-white text-rose-700 hover:border-rose-400"
                  }`}
                >
                  <span className="text-lg">{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep("when")}
                className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-500 transition hover:border-rose-400"
              >
                ← Back
              </button>
              <button
                onClick={confirmDate}
                className="flex-1 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
              >
                It&apos;s a date ❤️
              </button>
            </div>
          </div>
        )}

        {step === "confirmed" && (
          <div className="text-center">
            <p className="text-4xl">✨</p>
            <h1 className="mt-2 text-2xl font-bold text-rose-900">
              It&apos;s a date! 🌹
            </h1>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-left text-sm text-rose-800">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-400">Date</p>
                <p className="font-medium">{formatDate(date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-rose-400">Time</p>
                <p className="font-medium">{formatTime(time)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-rose-400">Plan</p>
                <p className="font-medium">{plan}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-rose-400">Food</p>
                <p className="font-medium">{selectedFood}</p>
              </div>
            </div>

            <div className="mx-auto mt-6 w-fit rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-400">
                When they said yes
              </p>
              <p className="my-2 text-5xl">🐶</p>
              <p className="text-xs font-bold uppercase tracking-wide text-rose-400">
                best day ever fr
              </p>
            </div>

            <p className="mt-6 text-sm italic text-rose-700">
              I&apos;ll pick you up at {formatTime(time)}. 🚗
            </p>
            <p className="text-sm text-rose-500">Can&apos;t wait to see you ✨</p>

            <button
              onClick={() => setStep("when")}
              className="mt-4 text-xs font-semibold text-rose-400 underline hover:text-rose-600"
            >
              Change the plan
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
