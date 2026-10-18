import { NextRequest, NextResponse } from "next/server";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/razorpay";
import { isPresetId, PASSPORT_PHOTO_PRICE_INR, PRESETS, type Crop } from "@/lib/passport-photo/presets";
import { sheet, single } from "@/lib/passport-photo/render";
import { jobId, unseal } from "@/lib/passport-photo/token";

export const runtime = "nodejs";
export const maxDuration = 30;

// Orders are immutable once paid, so a verified one never needs re-fetching.
const paidOrders = new Map<string, string>();

async function orderJob(orderId: string): Promise<string | null> {
  const cached = paidOrders.get(orderId);
  if (cached) return cached;
  const order = await getRazorpay().orders.fetch(orderId);
  const job = order.notes?.job;
  if (
    order.status !== "paid" ||
    Number(order.amount_paid) < PASSPORT_PHOTO_PRICE_INR * 100 ||
    order.notes?.product !== "passport-photo" ||
    typeof job !== "string"
  ) {
    return null;
  }
  paidOrders.set(orderId, job);
  return job;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    order_id?: string;
    payment_id?: string;
    signature?: string;
    token?: string;
    preset?: string;
    crop?: Crop;
  } | null;

  const { order_id, payment_id, signature, token, crop } = body ?? {};
  if (!order_id || !payment_id || !signature || !token || !crop || !isPresetId(body?.preset)) {
    return NextResponse.json({ error: "Missing details." }, { status: 400 });
  }

  try {
    if (!verifyRazorpaySignature(order_id, payment_id, signature)) {
      return NextResponse.json({ error: "Payment not verified." }, { status: 402 });
    }
    if ((await orderJob(order_id)) !== jobId(token)) {
      return NextResponse.json({ error: "That payment is for a different photo." }, { status: 402 });
    }
  } catch (error) {
    console.error("[passport-photo] payment check failed:", error);
    return NextResponse.json({ error: "Couldn't verify the payment. Try again." }, { status: 502 });
  }

  const image = unseal(token);
  if (!image) {
    return NextResponse.json(
      { error: "This photo has expired. Contact me with your payment ID for a refund." },
      { status: 410 }
    );
  }

  const preset = PRESETS[body!.preset as keyof typeof PRESETS];
  try {
    const [photo, print] = await Promise.all([single(image, crop, preset), sheet(image, crop, preset)]);
    return NextResponse.json({
      photo: `data:image/jpeg;base64,${photo.toString("base64")}`,
      photoKB: Math.round((photo.length / 1024) * 10) / 10,
      sheet: `data:image/jpeg;base64,${print.toString("base64")}`,
    });
  } catch (error) {
    console.error("[passport-photo] render failed:", error);
    return NextResponse.json({ error: "Couldn't build the files. Try again." }, { status: 500 });
  }
}
