import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  let verified: boolean;
  try {
    verified = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
  } catch (error) {
    console.error("Signature verification failed:", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Signature mismatch." }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
