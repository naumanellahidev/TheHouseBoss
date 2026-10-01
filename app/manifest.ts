import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

/**
 * The web app manifest — what an installed copy of this site is.
 *
 * ── Why it starts at the dashboard ────────────────────────────────────────
 *
 * This is installed by one person, on her phone, to answer enquiries and
 * approve reviews away from a desk. A home screen icon that opens the public
 * marketing site is a bookmark; one that opens the dashboard is the thing she
 * asked for. Anyone else who installs it lands on the sign-in screen, which is
 * the correct outcome rather than a leak — the proxy and the layout both check
 * the session regardless of how the page was reached.
 *
 * `scope` stays at the root so the public pages open INSIDE the app when they
 * are linked from it — the preview button on a listing, the live link on an
 * article — instead of kicking out to the browser mid-task.
 *
 * ── Why `standalone` and not `fullscreen` ─────────────────────────────────
 *
 * `fullscreen` takes the status bar with it, so there is no clock and no
 * battery while she is in the middle of writing a reply. `standalone` removes
 * the browser chrome and keeps the phone's.
 *
 * ── iOS ───────────────────────────────────────────────────────────────────
 *
 * Safari reads very little of this file. What makes the icon and the standalone
 * window work there is the `appleWebApp` block and the apple-touch-icon in
 * `app/layout.tsx`; this manifest is what Android and desktop Chrome read, and
 * what makes the install prompt appear at all.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — Dashboard`,
    short_name: "House Boss",
    description:
      "Enquiries, reviews, listings and articles for The House Boss — Lake Mary and Central Florida real estate.",

    start_url: "/admin",
    // Distinguishes this install from any other app served from the same
    // origin. Without it a later change to start_url creates a second install.
    id: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",

    /*
      Navy, matching the signed-in chrome rather than the public pages.

      Android tints the status bar with this, and the dashboard is the surface
      an installed copy opens on. The public site keeps its own light theme
      colour from the viewport export in `app/layout.tsx`.
    */
    // --color-porcelain-50, the page background.
    background_color: "#fdfeff",
    // --color-royal-900, the same navy as --color-primary.
    theme_color: "#0c1b3a",

    lang: "en-US",
    dir: "ltr",
    categories: ["business", "productivity"],

    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /*
        Android crops an icon to its launcher's shape and guarantees only the
        middle 80% survives. This one is drawn inside that safe zone, so the
        mark is not clipped on a device that uses circles.
      */
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],

    /*
      Long-press the installed icon and these are the jumps.

      The two things she opens the app to do. Both are behind the session check,
      so a shortcut tapped while signed out lands on the sign-in screen.
    */
    shortcuts: [
      {
        name: "New enquiries",
        short_name: "Enquiries",
        url: "/admin/leads?status=new",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Reviews to approve",
        short_name: "Reviews",
        url: "/admin/reviews",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
