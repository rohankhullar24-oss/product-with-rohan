"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-slate/15 bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy dark:text-foreground">
          Unsubscribe from mailing list
        </h1>
        <p className="mt-2 text-sm text-slate">
          Enter your email and you won&apos;t receive any further mailing-list updates from
          Product with Rohan. This doesn&apos;t affect your Product Shots login.
        </p>

        {status === "done" ? (
          <p className="mt-6 rounded-lg bg-accent-light px-4 py-3 text-sm text-navy">
            You&apos;re unsubscribed. <span className="font-medium">{email}</span> won&apos;t
            receive any more mailing-list emails.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-slate/25 px-5 py-3 text-sm text-navy outline-none focus:border-accent dark:text-foreground"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "sending" ? "Unsubscribing..." : "Unsubscribe"}
            </button>
            {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
          </form>
        )}

        <Link href="/" className="mt-6 inline-block text-sm text-accent hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeForm />
    </Suspense>
  );
}
