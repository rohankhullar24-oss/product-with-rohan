import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAccess } from "@/lib/issue-check/access";

export const runtime = "nodejs";

const PAGE = 20;
const URL_TTL_SECS = 60 * 60;

type MediaRef = { path: string; t: number };

/**
 * Every check, newest first, with its saved photo/frames (as short-lived
 * signed URLs from the private bucket) and the Right/Wrong ratings given on
 * it. Paged by created_at: pass the last item's created_at as `before`.
 */
export async function GET(request: NextRequest) {
  if (!hasAccess(request)) return NextResponse.json({ error: "Wrong access code." }, { status: 401 });
  if (isRateLimited(request, "issue-check-history", 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "History is not configured." }, { status: 500 });
  }

  const before = request.nextUrl.searchParams.get("before");
  const db = createAdminClient();

  let query = db
    .from("issue_check_log")
    .select(
      "id, created_at, model, secs, media_kind, view, findings, also_check, photo_ok, retake_reason, error, thumb, media"
    )
    .eq("kind", "check")
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt("created_at", before);

  const { data: rows, error } = await query;
  if (error) {
    console.error("[issue-check] history failed", error.message);
    return NextResponse.json({ error: "Could not load history." }, { status: 500 });
  }

  const page = (rows ?? []).slice(0, PAGE);
  const ids = page.map((r) => r.id as string);

  const [{ data: ratings }, signed] = await Promise.all([
    ids.length
      ? db
          .from("issue_check_log")
          .select("check_id, created_at, part, said, correct, truth")
          .eq("kind", "rating")
          .in("check_id", ids)
          .order("created_at")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    signUrls(
      db,
      page.flatMap((r) => ((r.media as MediaRef[] | null) ?? []).map((m) => m.path))
    ),
  ]);

  const items = page.map((r) => ({
    ...r,
    media: ((r.media as MediaRef[] | null) ?? [])
      .map((m) => ({ url: signed.get(m.path) ?? "", t: m.t }))
      .filter((m) => m.url),
    ratings: (ratings ?? [])
      .filter((x) => x.check_id === r.id)
      .map(({ part, said, correct, truth }) => ({ part, said, correct, truth })),
  }));

  return NextResponse.json({ items, more: (rows ?? []).length > PAGE });
}

async function signUrls(db: ReturnType<typeof createAdminClient>, paths: string[]) {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data, error } = await db.storage.from("issue-check-media").createSignedUrls(paths, URL_TTL_SECS);
  if (error) console.error("[issue-check] signing failed", error.message);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}
