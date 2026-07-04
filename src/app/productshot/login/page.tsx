"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That sign-in link looks incomplete. Please request a new one.",
  "both auth code and code verifier should be non-empty":
    "That link didn't work — this usually happens when it's opened in a different browser or app than the one you requested it from (e.g. an email app's built-in browser). Request a new link and open it in the same browser you're signing in from.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackErrorRaw = searchParams.get("error");
  const callbackError = callbackErrorRaw
    ? CALLBACK_ERROR_MESSAGES[callbackErrorRaw] ?? callbackErrorRaw
    : null;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-slate/15 bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy dark:text-foreground">
          Sign in to Product Shots
        </h1>
        <p className="mt-2 text-sm text-slate">
          One weekly article, the PM news that matters, and a daily product-sense
          question.
        </p>

        {callbackError && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {callbackError}
          </p>
        )}

        {status === "sent" ? (
          <p className="mt-6 rounded-lg bg-accent-light px-4 py-3 text-sm text-navy">
            Check <span className="font-medium">{email}</span> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleEmailSignIn} className="mt-6 flex flex-col gap-3">
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
              {status === "sending" ? "Sending link..." : "Email me a sign-in link"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
