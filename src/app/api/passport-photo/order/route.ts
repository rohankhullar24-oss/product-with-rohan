import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { getRazorpay } from "@/lib/razorpay";
import { PASSPORT_PHOTO_PRICE_INR } from "@/lib/passport-photo/presets";
import { jobId, unseal } from "@/lib/passport-photo/token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (isRateLimited(request, "passport-photo-order", 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token || !unseal(body.token)) {
    return NextResponse.json({ error: "This photo has expired. Upload it again." }, { status: 400 });
  }

  try {
    const order = await getRazorpay().orders.create({
      amount: PASSPORT_PHOTO_PRICE_INR * 100,
      currency: "INR",
      receipt: `pp_${randomUUID().slice(0, 30)}`,
      // The download route checks this, so one payment unlocks only this photo.
      notes: { product: "passport-photo", job: jobId(body.token) },
    });
    return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("[passport-photo] order creation failed:", error);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
