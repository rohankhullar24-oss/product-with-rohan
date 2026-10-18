import crypto from "crypto";

// The AI-edited photo travels back to the browser sealed (AES-256-GCM), and
// the browser hands it back when downloading. That keeps the tool stateless
// (no selfie is ever stored on the server) while the clean image stays
// unreadable until a verified payment unlocks the download route.

const TTL_MS = 24 * 60 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.PASSPORT_PHOTO_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("PASSPORT_PHOTO_SECRET / RAZORPAY_KEY_SECRET is not set.");
  return Buffer.from(crypto.hkdfSync("sha256", secret, "", "passport-photo-v1", 32));
}

export function seal(image: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const issued = Buffer.alloc(8);
  issued.writeBigUInt64BE(BigInt(Date.now()));
  const body = Buffer.concat([cipher.update(Buffer.concat([issued, image])), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** Returns null for a tampered, foreign or expired token. */
export function unseal(token: string): Buffer | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    if (Date.now() - Number(plain.readBigUInt64BE(0)) > TTL_MS) return null;
    return plain.subarray(8);
  } catch {
    return null;
  }
}

/** Short id stored in the Razorpay order's notes, binding one payment to one photo. */
export function jobId(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
}
