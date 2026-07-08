"use client";

import Script from "next/script";
import { useState } from "react";
import { track } from "@vercel/analytics";
import type { RazorpayFailureResponse, RazorpayPaymentResponse } from "@/types/razorpay";

const PRESETS = [49, 99, 199, 499];
const MIN_PAID_AMOUNT = 1;

export default function HandbookCheckout() {
  const [amount, setAmount] = useState<number>(199);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = customAmount !== "" ? Number(customAmount) : amount;
  const isValid = Number.isInteger(effectiveAmount) && effectiveAmount >= MIN_PAID_AMOUNT;

  async function handleContinue() {
    setError(null);

    if (!isValid) {
      setError(`Enter at least ₹${MIN_PAID_AMOUNT}.`);
      return;
    }

    setLoading(true);
    track("handbook_checkout_started", { amount: effectiveAmount });
    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok || !order.order_id) {
        setError(order.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (typeof window.Razorpay !== "function") {
        setError("Payment could not load. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount: order.amount,
        currency: order.currency,
        name: "The Product Manager Handbook",
        description: "PDF + Word edition — 5 volumes, 93 chapters",
        order_id: order.order_id,
        theme: { color: "#0d9488" },
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              setError("We couldn't verify that payment. Please contact me if you were charged.");
              setLoading(false);
              return;
            }
            track("handbook_payment_succeeded", { amount: effectiveAmount });
            const params = new URLSearchParams({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            window.location.href = `/handbook/success?${params.toString()}`;
          } catch {
            setError("We couldn't verify that payment. Please contact me if you were charged.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      razorpay.on("payment.failed", (response: RazorpayFailureResponse) => {
        track("handbook_payment_failed", { amount: effectiveAmount });
        setError(response.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });

      razorpay.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <p className="text-sm font-medium text-navy dark:text-white">Name your price</p>
      <p className="mt-1 text-sm text-slate dark:text-slate-400">
        Pay what you think it&apos;s worth — starting at ₹1. Card and UPI supported.
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
            ₹{preset}
          </button>
        ))}
        <input
          type="number"
          min={1}
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
        {loading ? "Redirecting…" : `Pay ₹${effectiveAmount} & download`}
      </button>
    </div>
  );
}
