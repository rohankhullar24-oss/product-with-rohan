"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CROSS_BROWSER_LINK_ERROR =
  "That link didn't work — this usually happens when it's opened in a different browser or app than the one you requested it from (e.g. an email app's built-in browser). Enter the 8-digit code from the same email instead, or request a new link and open it in the same browser you're signing in from.";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That sign-in link looks incomplete. Please request a new one.",
};

function describeCallbackError(raw: string): string {
  const known = CALLBACK_ERROR_MESSAGES[raw];
  if (known) return known;

  const normalized = raw.toLowerCase();
  const isPkceMismatch =
    normalized.includes("pkce") ||
    normalized.includes("code verifier") ||
    normalized.includes("code_verifier");
  if (isPkceMismatch) return CROSS_BROWSER_LINK_ERROR;

  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackErrorRaw = searchParams.get("error");
  const callbackError = callbackErrorRaw ? describeCallbackError(callbackErrorRaw) : null;

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/productshot/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setErrorMessage("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("sent");
      setErrorMessage(error.message);
    } else {
      router.push("/productshot/dashboard");
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

        {status === "sent" || status === "verifying" ? (
          <>
            <p className="mt-6 rounded-lg bg-accent-light px-4 py-3 text-sm text-navy">
              Check <span className="font-medium">{email}</span> for an 8-digit code (or a
              sign-in link).
            </p>
            <form onSubmit={handleVerifyCode} className="mt-4 flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="12345678"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-full border border-slate/25 px-5 py-3 text-center text-sm tracking-widest text-navy outline-none focus:border-accent dark:text-foreground"
              />
              <button
                type="submit"
                disabled={status === "verifying"}
                className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {status === "verifying" ? "Verifying..." : "Verify code"}
              </button>
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setCode("");
                  setErrorMessage("");
                }}
                className="text-sm text-slate underline-offset-2 hover:underline"
              >
                Use a different email
              </button>
            </form>
          </>
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
              {status === "sending" ? "Sending code..." : "Email me a sign-in code"}
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
