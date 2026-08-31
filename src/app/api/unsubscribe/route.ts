import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  if (isRateLimited(request, "unsubscribe", 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { email } = (await request.json()) as { email?: string };
  const normalized = email?.trim().toLowerCase();

  if (!normalized || !EMAIL_RE.test(normalized)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("mailing_unsubscribes").insert({ email: normalized });

  // 23505 = unique_violation — the email is already unsubscribed, which is
  // the desired end state, so treat it as success rather than an error.
  if (error && error.code !== "23505") {
    console.error("Unsubscribe insert failed:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
