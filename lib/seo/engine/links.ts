import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { GeoRelevance } from "@/lib/seo/geo/relevance";

/**
 * The internal-linking engine (brief §16, §39, §87, §96).
 *
 * ── What it is for ────────────────────────────────────────────────────────
 *
 * §39 asks for a "local topical authority network" — the homepage, city pages,
 * community pages, listings, guides and articles connected so that a reader
 * arriving anywhere can reach the rest, and a crawler can see that they are
 * about one place rather than being a pile of unrelated URLs.
 *
 * ── Why every link is verified before it is proposed ──────────────────────
 *
 * §87: never link to a page that does not exist. This engine does not compose
 * a URL and hope. Every candidate is looked up — a community link requires a
 * PUBLISHED community with that slug, a listing link requires a published
 * listing — and a candidate that does not resolve is dropped rather than
 * offered. That is the difference between an internal-linking engine and a
 * generator of 404s.
 *
 * ── Why links are proposed, never applied ─────────────────────────────────
 *
 * They land in `seo_internal_links` with status `proposed`, and the public RLS
 * policy admits only `accepted`. A metadata suggestion that turns out wrong is
 * a bad description; a link inserted into a page that turns out wrong is the
 * agent appearing to recommend something. §32's review gate is stricter here
 * for that reason, and it applies in auto mode too.
 *
 * ── Why the count is capped ───────────────────────────────────────────────
 *
 * §16 says contextual, not hundreds. A listing page with forty internal links
 * is a directory, and the links that matter are diluted by the ones that do
 * not. Six is enough to reach the city, the community, the relevant guide and
 * a couple of siblings.
 */

const MAX_LINKS_PER_PAGE = 6;

export type ProposedLink = {
  toPath: string;
  anchor: string;
  reason: string;
};

/** The static routes the engine may link to, and what each one is for. */
const GUIDES = [
  {
    path: "/guides/va-home-buyer",
    anchor: "VA home-buyer guide",
    matches: (ctx: LinkContext) => ctx.listingType === "va_eligible",
    reason: "This listing is classified as VA-eligible, and the guide explains what that means for a buyer.",
  },
  {
    path: "/assumable-mortgage-homes",
    anchor: "how assumable mortgages work",
    matches: (ctx: LinkContext) => ctx.listingType === "assumable",
    reason: "This listing is classified as having an assumable mortgage.",
  },
  {
    path: "/new-construction-representation",
    anchor: "new-construction representation",
    matches: (ctx: LinkContext) => ctx.listingType === "new_construction",
    reason: "This listing is new construction, where buyer representation works differently.",
  },
];

type LinkContext = {
  listingType?: string;
  citySlug?: string;
  communitySlug?: string | null;
};

/**
 * Propose links for one listing.
 *
 * Ordered by how useful each is to a reader who has just looked at this
 * property, which is also roughly how useful each is to a crawler trying to
 * understand what the page is about.
 */
export async function proposeListingLinks(
  listing: {
    id: string;
    slug: string;
    citySlug: string;
    cityName: string;
    communitySlug: string | null;
    communityName: string | null;
    listingType: string;
    price: number;
  },
  geo: GeoRelevance[],
): Promise<ProposedLink[]> {
  const db = createServiceClient();
  const out: ProposedLink[] = [];

  /* ── The community it is in ────────────────────────────────────────────── */

  if (listing.communitySlug && listing.communityName) {
    const { data } = await db
      .from("communities")
      .select("slug")
      .eq("slug", listing.communitySlug)
      .eq("published", true)
      .maybeSingle();

    // §87 in one line: the link exists only if the page does.
    if (data) {
      out.push({
        toPath: `/communities/${listing.communitySlug}`,
        anchor: listing.communityName,
        reason: `This property is in ${listing.communityName}, and the community page carries the HOA and amenity detail a buyer asks about next.`,
      });
    }
  }

  /* ── Its city ──────────────────────────────────────────────────────────── */

  const { data: city } = await db
    .from("cities")
    .select("slug")
    .eq("slug", listing.citySlug)
    .eq("published", true)
    .maybeSingle();

  if (city) {
    out.push(
      {
        toPath: `/${listing.citySlug}`,
        anchor: `living in ${listing.cityName}`,
        reason: `The city guide answers what a buyer wants to know about the area once they like the house.`,
      },
      {
        toPath: `/${listing.citySlug}/homes-for-sale`,
        anchor: `all homes for sale in ${listing.cityName}`,
        reason: "A reader who does not want this property still wants the others in the same city.",
      },
    );
  }

  /* ── The guide that matches its classification ─────────────────────────── */

  for (const guide of GUIDES) {
    if (guide.matches({ listingType: listing.listingType })) {
      out.push({ toPath: guide.path, anchor: guide.anchor, reason: guide.reason });
    }
  }

  /* ── A sibling or two, from the same city and a similar price ──────────── */

  /*
    Price-banded, not "most recent".

    Someone looking at a $525,000 house is not helped by a $1.2m one, and a
    "related properties" block that ignores price is the shape that makes
    people stop trusting the block. ±25% is the same band `getSimilarListings`
    already uses on the public page, so the engine and the page agree about
    what similar means.
  */
  const { data: siblings } = await db
    .from("listing_card")
    .select("slug, address, price")
    .eq("city_slug", listing.citySlug)
    .neq("slug", listing.slug)
    .in("status", ["active", "coming_soon", "pending"])
    .gte("price", Math.round(listing.price * 0.75))
    .lte("price", Math.round(listing.price * 1.25))
    .limit(2);

  for (const sibling of siblings ?? []) {
    // `address` is nullable on the view. A link whose anchor text is "null" is
    // worse than no link, so a row without one is skipped rather than patched
    // with a placeholder.
    if (!sibling.slug || !sibling.address) continue;
    out.push({
      toPath: `/listing/${sibling.slug}`,
      anchor: sibling.address,
      reason: `Another ${listing.cityName} property within 25% of this price.`,
    });
  }

  /* ── The region, when the graph says there is one ──────────────────────── */

  const region = geo.find((g) => g.layer === 5 && g.usableInCopy);
  if (region && out.length < MAX_LINKS_PER_PAGE) {
    out.push({
      toPath: "/search",
      anchor: `search every ${region.name} listing`,
      reason: region.reason,
    });
  }

  return out.slice(0, MAX_LINKS_PER_PAGE);
}

/**
 * Store proposals, keeping decisions a person has already made.
 *
 * A link that was rejected stays rejected. Re-proposing it on the next run
 * would put the same suggestion in front of the operator every week until they
 * stopped reading the queue, which is how a review surface dies.
 */
export async function persistLinks(
  owner: { listingId?: string; articleId?: string; cityId?: string; communityId?: string },
  links: ProposedLink[],
  runId: string,
): Promise<number> {
  const db = createServiceClient();

  /*
    Explicit per-owner objects rather than a computed `[column]: value` key.

    A computed key widens the object to an index signature, and the generated
    Supabase types reject that outright — correctly, because it also throws away
    the only check that the column name is real. The same reasoning as
    `markMaintenanceRun` in lib/queries/settings.ts.
  */
  const owned = <T extends object>(extra: T) => ({
    ...(owner.listingId ? { listing_id: owner.listingId } : {}),
    ...(owner.articleId ? { article_id: owner.articleId } : {}),
    ...(owner.cityId ? { city_id: owner.cityId } : {}),
    ...(owner.communityId ? { community_id: owner.communityId } : {}),
    ...extra,
  });

  const value =
    owner.listingId ?? owner.articleId ?? owner.cityId ?? owner.communityId;
  if (!value) return 0;

  const column = owner.listingId
    ? "listing_id"
    : owner.articleId
      ? "article_id"
      : owner.cityId
        ? "city_id"
        : "community_id";

  const { data: decided } = await db
    .from("seo_internal_links")
    .select("to_path, status")
    .eq(column, value)
    .neq("status", "proposed");

  const settled = new Set((decided ?? []).map((r) => r.to_path));

  // Clear only the undecided ones, then insert what is new.
  await db
    .from("seo_internal_links")
    .delete()
    .eq(column, value)
    .eq("status", "proposed");

  const rows = links
    .filter((link) => !settled.has(link.toPath))
    .map((link) =>
      owned({
        to_path: link.toPath,
        anchor: link.anchor,
        reason: link.reason,
        status: "proposed" as const,
        run_id: runId,
      }),
    );

  if (rows.length === 0) return 0;

  const { error } = await db.from("seo_internal_links").insert(rows);
  if (error) {
    console.error(`[seo-links] ${error.message}`);
    return 0;
  }
  return rows.length;
}
