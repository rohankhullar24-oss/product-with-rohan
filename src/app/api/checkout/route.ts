import { NextRequest, NextResponse } from "next/server";
import {
  getStripe,
  HANDBOOK_PRODUCT_METADATA_KEY,
  HANDBOOK_PRODUCT_METADATA_VALUE,
  MIN_PAID_AMOUNT_INR,
} from "@/lib/stripe";

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

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "upi"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            unit_amount: amount * 100,
            product_data: {
              name: "The Product Manager Handbook",
              description: "PDF + Word edition — 5 volumes, 93 chapters",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        [HANDBOOK_PRODUCT_METADATA_KEY]: HANDBOOK_PRODUCT_METADATA_VALUE,
      },
      success_url: `${origin}/handbook/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/handbook`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return NextResponse.json({ error: "Payment setup failed. Please try again." }, { status: 500 });
  }
}
