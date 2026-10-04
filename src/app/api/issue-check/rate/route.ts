import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAccess } from "@/lib/issue-check/access";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip =(v: unknown, n = 300) => (typeof v === "string" ? v.slice(0, n) : "");

/** Saves an inspector's Right/Wrong verdict on one finding — this is the accuracy data. */
export async function POST(request: NextRequest) {
  if (!hasAccess(request)) return NextResponse.json({ error: "Wrong access code." }, { status: 401 });
  if (isRateLimited(request, "issue-check-rate", 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ saved: false });

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.correct !== "boolean") {
    return NextResponse.json({ error: "Bad rating." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("issue_check_log")
    .insert({
      kind: "rating",
      model: clip(b.model, 80),
      part: clip(b.part),
      said: clip(b.said),
      correct: b.correct,
      truth: clip(b.truth),
      check_id: UUID.test(clip(b.checkId, 64)) ? b.checkId : null,
    });
  if (error) console.error("[issue-check] rating failed", error.message);
  return NextResponse.json({ saved: !error });
}

/** Overall accuracy across every inspector, for the page header. */
export async function GET(request: NextRequest) {
  if (!hasAccess(request)) return NextResponse.json({ error: "Wrong access code." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ rated: 0, right: 0 });

  const db = createAdminClient();
  const [all, right] = await Promise.all([
    db.from("issue_check_log").select("id", { count: "exact", head: true }).eq("kind", "rating"),
    db
      .from("issue_check_log")
      .select("id", { count: "exact", head: true })
      .eq("kind", "rating")
      .eq("correct", true),
  ]);
  return NextResponse.json({ rated: all.count ?? 0, right: right.count ?? 0 });
}
