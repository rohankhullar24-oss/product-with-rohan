import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your environment variables to enable paid handbook downloads."
      );
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export const HANDBOOK_PRODUCT_METADATA_KEY = "product";
export const HANDBOOK_PRODUCT_METADATA_VALUE = "pm-handbook";

// Stripe's minimum charge amount for INR is 50 paise; we set a higher floor
// so a "paid" selection is always meaningfully above the free tier.
export const MIN_PAID_AMOUNT_INR = 19;
