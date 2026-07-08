import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRazorpay, MIN_PAID_AMOUNT_INR } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  const { amount } = (await request.json()) as { amount?: number };

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount < MIN_PAID_AMOUNT_INR
  ) {
    return NextResponse.json(
      { error: `Amount must be a whole number of at least ₹${MIN_PAID_AMOUNT_INR}.` },
      { status: 400 }
    );
  }

  const amountInPaise = amount * 100;
  if (amountInPaise < 100) {
    return NextResponse.json({ error: "Amount must be at least 100 paise." }, { status: 400 });
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `hb_${randomUUID()}`,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: unknown) {
    console.error("Razorpay order creation failed:", error);
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode) === 401
          ? 401
          : 500
        : 500;
    return NextResponse.json({ error: "Could not create order. Please try again." }, { status });
  }
}
