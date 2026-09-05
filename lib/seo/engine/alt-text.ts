import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { Listing } from "@/types/domain";

/**
 * Alt text for listing photographs (brief §65, §66).
 *
 * ── The hard part is what NOT to write ────────────────────────────────────
 *
 * §65 gives the rule twice, positively and negatively:
 *
 *   Bad:  Lake Mary Florida homes for sale real estate realtor house
 *   Good: Modern Lake Mary home with screened pool and landscaped backyard
 *         — only if that is what the image actually shows.
 *
 * That last clause is the whole problem. **Nothing in this system has seen the
 * photograph.** There is no vision model configured, and Ollama's text endpoint
 * cannot look at an image. So a generator that writes "screened pool and
 * landscaped backyard" is guessing, and on the photo that happens to be the
 * laundry room it is simply wrong — to a blind visitor, who has no way to know
 * it is wrong.
 *
 * ── What is written instead ───────────────────────────────────────────────
 *
 * Only what the position and the record together actually establish. The first
 * photograph of a listing is, by universal convention in this industry, the
 * exterior — that is what a cover photo is. Beyond it, the honest statement is
 * that this is a photograph of a specific property, which is more than the
 * empty string it replaces and is not a claim about content.
 *
 * Alt text that describes the wrong thing is worse than alt text that describes
 * less. A screen-reader user cannot check it against the image.
 *
 * ── Why it is a suggestion, never a silent write ──────────────────────────
 *
 * `suggestAltText` returns; the admin applies. Alt text is an accessibility
 * obligation under WCAG 1.1.1 before it is an SEO field, and the person who
 * took the photograph is the one who can describe it. This exists to make that
 * take thirty seconds instead of five minutes, not to remove them from it.
 */

export type AltSuggestion = {
  /** Index into `listing.photos`. */
  index: number;
  suggestion: string;
  /** What the suggestion is based on, for the admin (§85). */
  basis: string;
};

/**
 * Suggest alt text for the photographs that have none.
 *
 * Photos that already have alt text are left alone entirely — a human
 * description is better than anything derivable here, always.
 */
export function suggestAltText(listing: Listing): AltSuggestion[] {
  const out: AltSuggestion[] = [];

  const place = listing.community
    ? `${listing.community.name}, ${listing.city.name}`
    : `${listing.city.name}, Florida`;

  listing.photos.forEach((photo, index) => {
    if (photo.alt?.trim()) return;

    if (index === 0) {
      /*
        The cover. Its subject IS known — a listing's first photograph is the
        exterior by convention, and the pipeline treats it as the cover
        everywhere else in this codebase.

        The property type comes from the record, so "single-family home" is a
        fact rather than a guess. What is deliberately absent: any adjective,
        any feature, any description of condition or style.
      */
      out.push({
        index,
        suggestion: `${listing.address} in ${place}, seen from the street`,
        basis:
          "The first photograph is the cover, which is the exterior by convention. The address and place come from the record.",
      });
      return;
    }

    out.push({
      index,
      suggestion: `Photograph ${index + 1} of ${listing.address} in ${place}`,
      basis:
        "Nothing here has seen this image, so it is described by what it is rather than by what it shows. Replace it with a real description if you can.",
    });
  });

  return out;
}

/**
 * Write suggestions into the photos that have no alt text.
 *
 * Returns how many changed. Never touches a photo that already has alt text,
 * and never overwrites — the guard is `!photo.alt?.trim()` in both this
 * function and the suggester, because a caller could otherwise pass a stale
 * suggestion list computed before somebody typed a real description.
 */
export async function applyAltText(
  listingId: string,
  suggestions: AltSuggestion[],
): Promise<number> {
  const db = createServiceClient();

  const { data: listing, error } = await db
    .from("listings")
    .select("photos")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) return 0;

  const photos = Array.isArray(listing.photos) ? [...listing.photos] : [];
  const byIndex = new Map(suggestions.map((s) => [s.index, s.suggestion]));
  let changed = 0;

  const next = photos.map((photo, index) => {
    const record = photo as Record<string, unknown>;
    const existing = String(record.alt ?? "").trim();
    const suggestion = byIndex.get(index);

    if (existing || !suggestion) return photo;

    changed += 1;
    return { ...record, alt: suggestion };
  });

  if (changed === 0) return 0;

  const { error: writeError } = await db
    .from("listings")
    .update({ photos: next })
    .eq("id", listingId);

  if (writeError) {
    console.error(`[alt-text] ${listingId}: ${writeError.message}`);
    return 0;
  }

  return changed;
}
