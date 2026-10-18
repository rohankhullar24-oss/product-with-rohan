import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { editToPassport, ProviderError } from "@/lib/passport-photo/ai";
import { isAttire } from "@/lib/passport-photo/presets";
import { normalise, preview } from "@/lib/passport-photo/render";
import { seal } from "@/lib/passport-photo/token";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
// The page downsizes the selfie first; this is only a backstop under Vercel's 4.5 MB body cap.
const MAX_B64 = 3_000_000;

export async function POST(request: NextRequest) {
  // Every call costs an AI image generation before anyone has paid, so keep this tight.
  if (isRateLimited(request, "passport-photo", 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    mime?: string;
    data?: string;
    attire?: string;
  } | null;

  if (!body?.data || typeof body.data !== "string" || !ALLOWED.includes(body.mime ?? "")) {
    return NextResponse.json({ error: "Upload a JPEG, PNG or WebP selfie." }, { status: 400 });
  }
  if (body.data.length > MAX_B64) {
    return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
  }
  const attire = isAttire(body.attire) ? body.attire : "none";

  try {
    const edited = await editToPassport(body.data, body.mime!, attire);
    const { jpeg, width, height } = await normalise(edited);
    const view = await preview(jpeg, width, height);
    return NextResponse.json({
      token: seal(jpeg),
      preview: `data:image/jpeg;base64,${view.toString("base64")}`,
      width,
      height,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[passport-photo] process failed:", error);
    return NextResponse.json({ error: "Couldn't process that photo. Try another one." }, { status: 500 });
  }
}
