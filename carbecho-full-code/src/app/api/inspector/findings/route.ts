import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  const { data, error } = await createPublicClient()
    .from("inspection_findings")
    .select("id, created_at, question, say, section, item, severity, action, thumb, has_photo")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[inspector] history read failed", error.message);
    return NextResponse.json({ error: "Could not load the findings log." }, { status: 502 });
  }

  return NextResponse.json({ findings: data ?? [] });
}
