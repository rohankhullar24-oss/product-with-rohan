import { after, NextRequest, NextResponse } from "next/server";
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
  type CheckResult,
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
    await saveCheck({ kind, media, thumb: body?.thumb, error: failure?.message ?? "AI unreachable" });
    return NextResponse.json(
      { error: failure?.message ?? "The AI could not be reached." },
      { status: failure?.status ?? 502 }
    );
  }

  const parsed = parseJson(answer.raw);
  if (!parsed) {
    await saveCheck({ model: answer.model, kind, media, thumb: body?.thumb, error: "Unreadable AI answer" });
    return NextResponse.json({ error: "The AI answer could not be read. Try again." }, { status: 502 });
  }

  const result = resolve(parsed, parts, media.length);
  if (kind === "frames") {
    for (const f of result.findings) f.time = mmss(media[f.frame]?.t);
  }
  const secs = Math.round((Date.now() - t0) / 100) / 10;

  const checkId = await saveCheck({
    model: answer.model,
    secs,
    kind,
    media,
    thumb: body?.thumb,
    result,
  });

  return NextResponse.json({ ...result, secs, model: answer.model, checkId });
}

/**
 * Records one check for the history page, successful or not. The row is
 * written before the response (ratings need its id); the photo/frames are
 * uploaded to the private issue-check-media bucket after it, so the
 * inspector never waits on storage. Never throws: logging must not cost the
 * inspector their answer.
 */
async function saveCheck(c: {
  model?: string;
  secs?: number;
  kind: MediaKind;
  media: Frame[];
  thumb?: unknown;
  result?: CheckResult;
  error?: string;
}): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = createAdminClient();
  const r = c.result;
  const { data, error } = await db
    .from("issue_check_log")
    .insert({
      kind: "check",
      provider: c.model ? (c.model.startsWith("claude") ? "claude" : "gemini") : null,
      model: c.model ?? null,
      secs: c.secs ?? null,
      media_kind: c.kind,
      view: r ? r.view.slice(0, 500) : null,
      // Everything the inspector saw except the per-part option lists.
      findings: r
        ? r.findings.map((f) => {
            const { options, ...rest } = f;
            void options;
            return rest;
          })
        : null,
      also_check: r?.alsoCheck.slice(0, 500) ?? null,
      photo_ok: r ? r.photoOk : null,
      retake_reason: r?.retakeReason.slice(0, 500) ?? null,
      error: c.error ?? null,
      thumb: typeof c.thumb === "string" && c.thumb.length <= MAX_THUMB ? c.thumb : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[issue-check] log failed", error?.message);
    return null;
  }

  const id = data.id as string;
  after(async () => {
    const bucket = db.storage.from("issue-check-media");
    const saved = await Promise.all(
      c.media.map(async (m, i) => {
        const path = `${id}/${i}.jpg`;
        const { error: upErr } = await bucket.upload(path, Buffer.from(m.data, "base64"), {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (upErr) console.error("[issue-check] media upload failed", path, upErr.message);
        return upErr ? null : { path, t: Number(m.t) || 0 };
      })
    );
    const { error: updErr } = await db
      .from("issue_check_log")
      .update({ media: saved.filter(Boolean) })
      .eq("id", id);
    if (updErr) console.error("[issue-check] media update failed", updErr.message);
  });
  return id;
}
