"use client";

import { useState } from "react";

const PRESETS = [0, 99, 199, 499];
const MIN_PAID_AMOUNT = 19;

export default function HandbookCheckout() {
  const [amount, setAmount] = useState<number>(199);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = customAmount !== "" ? Number(customAmount) : amount;
  const isFree = effectiveAmount === 0;
  const isValid =
    isFree || (Number.isInteger(effectiveAmount) && effectiveAmount >= MIN_PAID_AMOUNT);

  async function handleContinue() {
    setError(null);

    if (isFree) {
      window.location.href = "/api/handbook/download?type=pdf&free=true";
      return;
    }

    if (!isValid) {
      setError(`Enter ₹0 for free, or at least ₹${MIN_PAID_AMOUNT}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
      <p className="text-sm font-medium text-navy dark:text-white">Name your price</p>
      <p className="mt-1 text-sm text-slate dark:text-slate-400">
        Pay what you think it&apos;s worth — including ₹0. Card and UPI supported.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(preset);
              setCustomAmount("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              customAmount === "" && amount === preset
                ? "bg-navy text-white dark:bg-accent"
                : "border border-slate-300 text-navy dark:border-slate-600 dark:text-white hover:border-accent hover:text-accent"
            }`}
          >
            {preset === 0 ? "Free" : `₹${preset}`}
          </button>
        ))}
        <input
          type="number"
          min={0}
          placeholder="Custom ₹"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="w-28 rounded-full border border-slate-300 px-4 py-2 text-sm text-navy dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="mt-5 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-accent"
      >
        {loading ? "Redirecting…" : isFree ? "Get it free" : `Pay ₹${effectiveAmount} & download`}
      </button>
    </div>
  );
}
