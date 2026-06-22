"use client";

import { useState } from "react";

type Step = "input" | "questions" | "result";

type Criterion = "speed" | "quality" | "cost" | "fun";

const CRITERION_LABELS: Record<Criterion, string> = {
  speed: "Getting it done quickly",
  quality: "Getting the best possible outcome",
  cost: "Keeping cost/effort low",
  fun: "Enjoying the process",
};

const ENERGY_LABELS: Record<string, string> = {
  low: "low — you'd rather not revisit this",
  medium: "moderate — you could course-correct if needed",
  high: "high — you're fine experimenting and adjusting",
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

type RankedOption = {
  name: string;
  score: number;
};

export default function DecisionDice() {
  const [step, setStep] = useState<Step>("input");
  const [topic, setTopic] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [criterion, setCriterion] = useState<Criterion | null>(null);
  const [gutPick, setGutPick] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [results, setResults] = useState<RankedOption[]>([]);

  const options = optionsText
    .split("\n")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  function goToQuestions() {
    if (options.length < 2) return;
    setStep("questions");
  }

  function computeResults() {
    const ranked: RankedOption[] = options.map((name) => {
      let score = (hashString(name + topic) % 60) + 20; // 20-79 base
      if (gutPick && name.toLowerCase() === gutPick.toLowerCase()) {
        score += 25;
      }
      if (criterion === "fun") {
        score += hashString(name + "fun") % 10;
      }
      return { name, score: Math.min(score, 100) };
    });
    ranked.sort((a, b) => b.score - a.score);
    setResults(ranked);
    setStep("result");
  }

  function reset() {
    setStep("input");
    setTopic("");
    setOptionsText("");
    setCriterion(null);
    setGutPick("");
    setEnergy("");
    setResults([]);
  }

  function rationale(): string {
    const winner = results[0];
    if (!winner) return "";

    const parts: string[] = [];

    if (gutPick && winner.name.toLowerCase() === gutPick.toLowerCase()) {
      parts.push(`your gut was already leaning this way`);
    }

    if (criterion) {
      parts.push(`it fits your priority of ${CRITERION_LABELS[criterion].toLowerCase()}`);
    }

    if (energy === "low") {
      parts.push(`it's the lower-regret option if you don't want to revisit this`);
    } else if (energy === "high") {
      parts.push(`you have the bandwidth to adjust later if it's not perfect`);
    }

    const reason =
      parts.length > 0
        ? parts.join(", and ")
        : "it edges out the alternatives on balance";

    return `Go with "${winner.name}" — ${reason}.`;
  }

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Side Project
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-navy">Decision Dice</h3>
        <p className="mt-4 text-slate">
          Stuck choosing between a few options? Tell Decision Dice what you&apos;re deciding,
          answer a couple of quick questions about your priorities, and get a ranked
          recommendation with a one-line rationale.
        </p>

        <div className="mt-10 rounded-xl border border-slate-200 p-6">
          {step === "input" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-navy">
                  What are you deciding? (optional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. What to do this weekend"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy">
                  Your options (one per line, at least 2)
                </label>
                <textarea
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder={"Hiking\nMovie marathon\nCatch up with friends"}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy focus:border-accent focus:outline-none"
                />
              </div>

              <button
                onClick={goToQuestions}
                disabled={options.length < 2}
                className="mt-2 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {step === "questions" && (
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-semibold text-navy">
                  What matters most to you right now?
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.keys(CRITERION_LABELS) as Criterion[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCriterion(c)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        criterion === c
                          ? "border-accent bg-accent-light text-navy font-semibold"
                          : "border-slate-300 text-slate hover:border-accent"
                      }`}
                    >
                      {CRITERION_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy">
                  Do you already have a slight gut preference?
                </label>
                <select
                  value={gutPick}
                  onChange={(e) => setGutPick(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-navy focus:border-accent focus:outline-none"
                >
                  <option value="">No preference</option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy">
                  If this choice turns out to be the &quot;wrong&quot; one, how much energy do
                  you have to deal with that?
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {Object.keys(ENERGY_LABELS).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEnergy(e)}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize transition ${
                        energy === e
                          ? "border-accent bg-accent-light text-navy font-semibold"
                          : "border-slate-300 text-slate hover:border-accent"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate transition hover:border-accent"
                >
                  Back
                </button>
                <button
                  onClick={computeResults}
                  disabled={!criterion || !energy}
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Get my recommendation
                </button>
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-lg bg-accent-light p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  Recommendation
                </p>
                <p className="mt-2 text-lg font-bold text-navy">{rationale()}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-navy">Full ranking</p>
                <div className="mt-3 flex flex-col gap-2">
                  {results.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-semibold text-slate">#{i + 1}</span>
                      <span className="w-40 flex-shrink-0 text-sm text-navy">{r.name}</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{ width: `${r.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={reset}
                className="self-start rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate transition hover:border-accent"
              >
                Try another decision
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
