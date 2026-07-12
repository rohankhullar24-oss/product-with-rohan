import { Resend } from "resend";

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set.");
    }
    client = new Resend(apiKey);
  }
  return client;
}

export const HANDBOOK_FROM_EMAIL =
  process.env.HANDBOOK_FROM_EMAIL ?? "hello@productwithrohan.online";
