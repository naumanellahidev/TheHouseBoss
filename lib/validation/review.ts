import { z } from "zod";

/**
 * The review a visitor writes about working with Krisi.
 *
 * SEPARATE from `reviewSchema` in `lib/validation/place.ts`, and deliberately.
 * That one is the admin's editor: it can set `published`, `sortOrder` and
 * `source`, because an admin transcribing a Google review is recording a fact
 * about where it came from. This one is filled in by a stranger, so it carries
 * none of those fields — the route sets them. A schema that let the visitor
 * choose would be a schema that let them publish themselves.
 *
 * The two are used on both sides of their own wire, which is the rule that
 * matters: this schema is imported by the public form AND by `/api/reviews`.
 */

/** Blank optional text becomes null before anything else looks at it. */
const optional = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const PUBLIC_REVIEW_MIN = 60;

export const publicReviewSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(120, "That name is too long"),

  /**
   * Optional, and never public.
   *
   * `docs/09 § 7` allows publishing only reviews actually received, and the
   * admin screen carries that warning — but a warning is only actionable if
   * there is some way to check. An address here is the only way the person who
   * wrote a review can be reached to confirm it. Migration 024 revokes anon's
   * SELECT on the column so it cannot be read back off the public API.
   */
  authorEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().email("Enter a valid email, or leave it blank").max(200).nullable().optional(),
  ),

  /** "Buyer, Lake Mary" — how they would like to be described. */
  authorRole: optional(120),

  rating: z
    .number({ message: "Choose a rating" })
    .int()
    .min(1, "Choose a rating")
    .max(5),

  /*
    Sixty characters, not ten.

    The admin schema allows ten because an admin pasting a real one-line Google
    review should not be argued with. A stranger typing into a form is a
    different case: "great!" is not a review, it is a rating with a word next to
    it, and it costs the client moderation time to reject. The message says what
    to do rather than what is wrong.
  */
  body: z
    .string()
    .trim()
    .min(PUBLIC_REVIEW_MIN, "Tell us a little more — a sentence or two about what happened.")
    .max(5000, "That is longer than the form accepts. Trim it a little."),

  /**
   * Honeypot. A real person never sees it, so a filled value is a bot.
   *
   * Named to look worth filling in. Checked by `isSpam` rather than by the
   * schema, because a tripped honeypot must return the SUCCESS shape — telling
   * a bot it was caught only teaches whoever wrote it. Same reasoning as
   * `lib/validation/lead.ts`.
   */
  website: z.string().max(200).optional(),
});

export type PublicReviewInput = z.infer<typeof publicReviewSchema>;

export function isSpam(input: PublicReviewInput): boolean {
  return Boolean(input.website && input.website.trim().length > 0);
}
