import { NextResponse, type NextRequest } from "next/server";

import { REVIEW_LIMIT, clientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSpam, publicReviewSchema } from "@/lib/validation/review";

/**
 * Public review intake.
 *
 * Modelled on `/api/leads`, and for the same reasons — but with one difference
 * that is the whole point of the endpoint: what it writes is INVISIBLE until an
 * admin publishes it.
 *
 * Protections, in order:
 *   1. rate limit, 3 per IP per day (`REVIEW_LIMIT`)
 *   2. the same zod schema the form used — never validate in only one place
 *   3. honeypot; a tripped honeypot returns the success shape without writing
 *
 * The write uses the RLS-respecting client, never the service role. Migration
 * 024 grants anon INSERT `with check (published = false)`, so this route
 * physically cannot create a published review even if the code above it were
 * wrong. `published` is still passed explicitly rather than left to the column
 * default: the security is the policy, and the code should say the same thing
 * the policy says.
 *
 * No `.select()` on the insert, for the same reason as leads: PostgREST turns
 * one into `INSERT ... RETURNING`, RETURNING is evaluated against the SELECT
 * policy, and the statement is refused with a misleading RLS error. Nothing
 * here needs the row back.
 *
 * `source: "Direct"` is not a guess. The column's CHECK lists where a review
 * came from, and this one came straight from the person who wrote it rather
 * than from Google or Zillow. The admin can change it if they later find the
 * same review posted elsewhere.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`review:${ip}`, REVIEW_LIMIT.limit, REVIEW_LIMIT.windowMs);

  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          "That is several reviews from one connection today. If something did not send, get in touch instead.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request was malformed." }, { status: 400 });
  }

  const parsed = publicReviewSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Please check the form and try again." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Honeypot. Same response shape as success, no row written.
  if (isSpam(input)) return NextResponse.json({ ok: true });

  const now = new Date();

  const db = await createSupabaseServerClient();
  const { error } = await db.from("reviews").insert({
    author_name: input.authorName,
    author_email: input.authorEmail ?? null,
    author_role: input.authorRole ?? null,
    rating: input.rating,
    body: input.body,
    source: "Direct",
    /*
      The date the review was written, which is the date it is about. The admin
      can correct it — someone may be describing a sale that closed in March —
      but a review with no date at all renders without one, and an undated
      review reads as older than it is.
    */
    reviewed_at: now.toISOString().slice(0, 10),
    submitted_at: now.toISOString(),
    published: false,
  });

  if (error) {
    // Never log the payload — it carries a name and an email (docs/09 § 5).
    console.error(`[reviews] insert failed: ${error.message}`);
    return NextResponse.json(
      { error: "That review could not be sent. Try again in a moment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
