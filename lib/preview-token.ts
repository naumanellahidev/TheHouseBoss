import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shareable draft-preview links — docs/06 § 5.
 *
 * An admin can always preview a draft, because the middleware already gates
 * `/admin`. The token exists for the other case: sending a draft to the broker
 * or to a client for review without giving them an account.
 *
 * HMAC over the article id, so a token cannot be guessed or transplanted onto a
 * different article. There is no expiry — these are drafts, not credentials,
 * and a link that dies mid-review is worse than one that outlives its use.
 * Rotating `DRAFT_PREVIEW_SECRET` invalidates every outstanding link at once.
 *
 * When the secret is unset, tokens are refused rather than accepted: preview
 * then requires a sign-in, which is a working state, whereas accepting anything
 * would make every draft public.
 */

export function signPreviewToken(articleId: string): string | null {
  const secret = process.env.DRAFT_PREVIEW_SECRET;
  if (!secret) return null;

  return createHmac("sha256", secret).update(articleId).digest("hex").slice(0, 32);
}

export function verifyPreviewToken(articleId: string, token: string | undefined): boolean {
  if (!token) return false;

  const expected = signPreviewToken(articleId);
  if (!expected) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  // Length must match before timingSafeEqual, which throws on a mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}
