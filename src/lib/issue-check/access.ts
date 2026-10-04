import { timingSafeEqual } from "node:crypto";

/**
 * Optional shared access code. When ISSUE_CHECK_CODE is set, every call must
 * send it in the x-access-code header; when unset the tool is open (still
 * rate-limited), like the other unlisted inspector tools.
 */
export function hasAccess(request: Request): boolean {
  const expected = process.env.ISSUE_CHECK_CODE;
  if (!expected) return true;
  const given = request.headers.get("x-access-code") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
