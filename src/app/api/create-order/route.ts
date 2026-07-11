import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getRazorpay, HANDBOOK_PRICE_INR } from "@/lib/razorpay";

export async function POST() {
  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: HANDBOOK_PRICE_INR * 100,
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
