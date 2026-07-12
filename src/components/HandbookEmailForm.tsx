"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function HandbookEmailForm({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/handbook/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          order_id: orderId,
          payment_id: paymentId,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not send email. Please try again.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMessage("Could not send email. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-3 rounded-lg bg-accent-light px-4 py-3 text-sm text-navy">
        Sent! Check <span className="font-medium">{email}</span> for the PDF and Word files.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-start justify-center gap-2">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-56 rounded-full border border-slate-300 px-4 py-2 text-sm text-navy outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-accent"
      >
        {status === "sending" ? "Sending…" : "Email me the files"}
      </button>
      {status === "error" && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
