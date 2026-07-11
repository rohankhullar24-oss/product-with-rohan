"use client";

import Script from "next/script";
import { useState } from "react";
import { track } from "@vercel/analytics";
import type { RazorpayFailureResponse, RazorpayPaymentResponse } from "@/types/razorpay";

const HANDBOOK_PRICE_INR = 199;

export default function HandbookCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setError(null);
    setLoading(true);
    track("handbook_checkout_started", { amount: HANDBOOK_PRICE_INR });
    try {
      const orderRes = await fetch("/api/create-order", { method: "POST" });
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
            track("handbook_payment_succeeded", { amount: HANDBOOK_PRICE_INR });
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
        track("handbook_payment_failed", { amount: HANDBOOK_PRICE_INR });
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

      <p className="text-2xl font-semibold text-navy dark:text-white">
        ₹{HANDBOOK_PRICE_INR}
      </p>
      <p className="mt-1 text-sm text-slate dark:text-slate-400">
        One-time payment. Card and UPI supported.
      </p>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="mt-5 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-accent"
      >
        {loading ? "Redirecting…" : `Pay ₹${HANDBOOK_PRICE_INR} & download`}
      </button>
    </div>
  );
}
