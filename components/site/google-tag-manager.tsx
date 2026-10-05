import Script from "next/script";

import { siteConfig } from "@/lib/site-config";

/**
 * Google Tag Manager, on the public site.
 *
 * ── Why the marketing layout and not the root one ─────────────────────────
 *
 * Google's install instructions say "every page of your website", and for a
 * brochure site that is right. This one has a signed-in dashboard on the same
 * origin, and GTM is a script loader: whatever tag somebody adds in the GTM
 * console later runs with full access to the page it lands on. On `/admin` that
 * page holds the admin's session and every enquiry's name, email and phone
 * number. A marketing tool has no reason to be there and a single careless tag
 * would be a data leak, so the container is mounted by
 * `app/(marketing)/layout.tsx` and the dashboard never loads it.
 *
 * ── Why `afterInteractive` and not the top of <head> ──────────────────────
 *
 * Google asks for the snippet "as high in the head as possible" so it starts
 * loading early. `next/script` with `afterInteractive` injects it as soon as the
 * page hydrates — still before almost any visitor interaction, and it is the
 * strategy Next.js documents for tag managers. The alternative, a blocking
 * script in the head, would cost the mobile Lighthouse score the site has been
 * working to raise, for a measurement that loses nothing by starting a few
 * hundred milliseconds later. The snippet itself already loads `gtm.js` with
 * `async`, so Google's own code does not assume it blocks.
 *
 * ── The noscript frame ────────────────────────────────────────────────────
 *
 * Google's second snippet, for visitors with JavaScript disabled. It renders
 * only in that case — React treats `<noscript>` content as inert on the client —
 * and carries a title, because a frame with no accessible name is an
 * accessibility violation even when it is invisible.
 */
export function GoogleTagManager() {
  const id = siteConfig.googleTagManagerId;
  if (!id) return null;

  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          title="Google Tag Manager"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>

      {/* Google's snippet, verbatim apart from the container ID. */}
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`}
      </Script>
    </>
  );
}
