import { OG_SIZE, ogResponse } from "@/lib/seo/og";
import { siteConfig } from "@/lib/site-config";

/**
 * The site's default social card.
 *
 * Rebuilt in Phase 6 onto the shared card in `lib/seo/og.tsx`, so the default
 * and the per-route cards for listings, articles and cities are one design
 * rather than two that drift.
 *
 * System fonts only — loading a webfont here costs build time on every
 * generation, and the card does not need Fraunces to read as premium.
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
