"use server";

import { requireAdmin } from "@/lib/supabase/server";
import {
  articleDescriptionFrom,
  articleTitleFrom,
  listingDescriptionFrom,
  listingTitleFrom,
  type ArticleFacts,
  type ListingFacts,
} from "@/lib/seo/auto/generate";
import { polishDescription } from "@/lib/seo/auto/ollama";

/**
 * "Write it for me" — the button in a record's SEO tab.
 *
 * ── Why this takes form values and not a record id ────────────────────────
 *
 * The button has to work on a listing that has never been saved. Reading the
 * row back would make the feature unavailable exactly when it is most useful —
 * on a new listing, where nothing has been typed yet and the whole point is not
 * to have to. So it takes what the form knows and returns copy the admin can
 * see before deciding to keep it.
 *
 * ── What it does NOT do ───────────────────────────────────────────────────
 *
 * It does not save. Generation on publish already guarantees every published
 * page has metadata; this is the preview, and pressing it must never be a
 * write. The admin edits what comes back, or clears it and lets the automatic
 * version stand.
 *
 * ── Facts only ────────────────────────────────────────────────────────────
 *
 * The model is given the record's own text and its output is rejected if it
 * contains a numeral that was not in the input (`lib/seo/auto/ollama.ts`). On a
 * property listing an invented bedroom count is a misrepresentation under FREC
 * advertising rules, not a stylistic slip.
 */

export type Suggestion =
  | { ok: true; title: string; description: string; usedModel: boolean }
  | { ok: false; error: string };

export async function suggestListingSeo(facts: ListingFacts): Promise<Suggestion> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!facts?.address?.trim() || !facts?.cityName?.trim()) {
    return {
      ok: false,
      error: "Add the address and city first — they are what the description is built from.",
    };
  }

  const fallback = listingDescriptionFrom(facts);
  const source = [
    `${facts.address}, ${facts.cityName}, Florida`,
    facts.beds ? `${facts.beds} bedrooms` : "",
    facts.baths ? `${facts.baths} bathrooms` : "",
    facts.sqft ? `${facts.sqft} square feet` : "",
    facts.yearBuilt ? `built ${facts.yearBuilt}` : "",
    facts.contractorsTake ?? "",
  ]
    .filter(Boolean)
    .join(". ");

  const { text, usedModel } = await polishDescription({
    fallback,
    source,
    kind: "listing",
  });

  return {
    ok: true,
    title: listingTitleFrom(facts),
    description: text,
    usedModel,
  };
}

export async function suggestArticleSeo(facts: ArticleFacts): Promise<Suggestion> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!facts?.title?.trim()) {
    return { ok: false, error: "Give the article a title first." };
  }

  const fallback = articleDescriptionFrom(facts);
  const source = `${facts.title}. ${(facts.bodyText ?? facts.excerpt ?? "").slice(0, 600)}`;

  const { text, usedModel } = await polishDescription({
    fallback,
    source,
    kind: "article",
  });

  return {
    ok: true,
    title: articleTitleFrom(facts),
    description: text,
    usedModel,
  };
}
