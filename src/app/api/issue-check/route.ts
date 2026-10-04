import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAccess } from "@/lib/issue-check/access";
import { loadTaxonomy } from "@/lib/issue-check/taxonomy";
import {
  callClaude,
  callGemini,
  instructions,
  mmss,
  parseJson,
  ProviderError,
  resolve,
  type Frame,
  type MediaKind,
} from "@/lib/issue-check/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_FRAMES = 20;
// Vercel caps a request body at 4.5 MB; the page downsizes media to stay well under it.
const MAX_TOTAL_B64 = 4_000_000;
const MAX_THUMB = 60_000;

export async function POST(request: NextRequest) {
  if (!hasAccess(request)) {
    return NextResponse.json({ error: "Wrong access code." }, { status: 401 });
  }
  if (isRateLimited(request, "issue-check", 15, 60_000)) {
    return NextResponse.json({ error: "Too many checks. Wait a minute." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: MediaKind;
    media?: Frame[];
    thumb?: string;
  } | null;

  const kind: MediaKind = body?.kind === "frames" ? "frames" : "image";
  const media = Array.isArray(body?.media) ? body!.media : [];
  if (!media.length) return NextResponse.json({ error: "No photo received." }, { status: 400 });
  if (media.length > (kind === "frames" ? MAX_FRAMES : 1)) {
    return NextResponse.json({ error: "Too many frames." }, { status: 400 });
  }
  let total = 0;
  for (const m of media) {
    if (!ALLOWED.includes(m?.mime) || typeof m.data !== "string") {
      return NextResponse.json({ error: "Unsupported file. Use a photo or video." }, { status: 400 });
    }
    total += m.data.length;
  }
  if (total > MAX_TOTAL_B64) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }

  const t0 = Date.now();
  let parts;
  let system;
  try {
    const tax = await loadTaxonomy();
    parts = tax.parts;
    system = instructions(tax.text);
  } catch (e) {
    console.error("[issue-check] taxonomy", e);
    return NextResponse.json({ error: "The parts list could not be loaded." }, { status: 500 });
  }

  // Gemini by default (its key already powers the inspector tools); the other
  // provider is a fallback when the first one fails and its key is set.
  const order =
    process.env.ISSUE_CHECK_PROVIDER === "claude" ? [callClaude, callGemini] : [callGemini, callClaude];
  let answer: { raw: string; model: string } | null = null;
  let failure: ProviderError | null = null;
  for (const call of order) {
    try {
      answer = await call(system, media, kind);
      break;
    } catch (e) {
      failure = e instanceof ProviderError ? e : new ProviderError("The AI could not be reached.", 502);
      console.error("[issue-check] provider failed", e);
    }
  }
  if (!answer) {
    return NextResponse.json(
      { error: failure?.message ?? "The AI could not be reached." },
      { status: failure?.status ?? 502 }
    );
  }

  const parsed = parseJson(answer.raw);
  if (!parsed) {
    return NextResponse.json({ error: "The AI answer could not be read. Try again." }, { status: 502 });
  }

  const result = resolve(parsed, parts, media.length);
  if (kind === "frames") {
    for (const f of result.findings) f.time = mmss(media[f.frame]?.t);
  }
  const secs = Math.round((Date.now() - t0) / 100) / 10;

  let checkId: string | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await createAdminClient()
      .from("issue_check_log")
      .insert({
        kind: "check",
        provider: answer.model.startsWith("claude") ? "claude" : "gemini",
        model: answer.model,
        secs,
        media_kind: kind,
        view: result.view.slice(0, 500),
        findings: result.findings.map((f) => ({
          part: f.part,
          issueId: f.issueId,
          issue: f.issue,
          confidence: f.confidence,
        })),
        thumb: typeof body?.thumb === "string" && body.thumb.length <= MAX_THUMB ? body.thumb : null,
      })
      .select("id")
      .single();
    if (error) console.error("[issue-check] log failed", error.message);
    checkId = data?.id ?? null;
  }

  return NextResponse.json({ ...result, secs, model: answer.model, checkId });
}
