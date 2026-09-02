import { OG_SIZE, ogResponse } from "@/lib/seo/og";
import { siteConfig } from "@/lib/site-config";

/**
 * The default social card for every marketing page.
 *
 * A duplicate of the root one on purpose. Next resolves `opengraph-image` from
 * the nearest ancestor segment, and the root file was not reaching pages inside
 * the `(marketing)` route group — the home page was shipping with no og:image
 * at all. Placing one inside the group covers every page in it that does not
 * define its own; listings, articles and cities still override this with their
 * own generated cards.
 *
 * Both files delegate to the same card in `lib/seo/og.tsx`, so there is one
 * design and no drift.
 */

export const runtime = "nodejs";
export const alt = "The House Boss — Lake Mary & Central Florida Real Estate";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogResponse({
    eyebrow: "Lake Mary · Central Florida",
    title: "Find your home in Central Florida",
    subtitle: siteConfig.positioning,
  });
}
