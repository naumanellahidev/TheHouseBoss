import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { CustomCursor } from "@/components/site/custom-cursor";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { PageTransition } from "@/components/site/page-transition";
import { JsonLd } from "@/components/site/json-ld";
import { agentJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { getSiteSettings } from "@/lib/queries/settings";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";

/**
 * Public marketing shell. The compliance footer is rendered inside <Footer />,
 * so every page in this group carries the legally required disclosure
 * (CLAUDE.md hard rule 15).
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Contact details and profile links come from Admin → Settings, so adding a
  // Zillow profile updates the sameAs array on every page without a deploy.
  const settings = await safeQuery(
    () => getSiteSettings(),
    EMPTY_SETTINGS,
    "getSiteSettings(layout)",
  );

  return (
    <>
      {/*
        RealEstateAgent + WebSite ride on every public page, so the entity graph
        is present wherever a crawler lands rather than only on /about.
        Page-level graphs (Person, Article, FAQPage, BreadcrumbList) are added by
        the pages themselves and resolve against these by @id.
      */}
      <JsonLd data={[agentJsonLd(settings), websiteJsonLd()]} />

      {/* WCAG 2.4.1 — must be the first focusable element on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-fg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>

      <Header settings={settings} />

      <main id="main" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>

      <Footer settings={settings} />

      {/*
        Decorative, desktop-only, and it never hides the real cursor — see the
        component. Mounted once here rather than per page so a route change
        cannot leave two of them behind.
      */}
      <CustomCursor />

      {/*
        Cookieless, so no consent banner — which is the reason it was chosen
        over GA4 rather than an incidental benefit. The reasoning, and what was
        deliberately NOT installed, is in docs/17-launch-operations.md § 1.

        Mounted in the marketing group only. The admin dashboard is one signed-in
        person doing her job; measuring her is noise in the numbers and one more
        place her behaviour is recorded for no purpose.

        Gated on VERCEL_ENV rather than rendered unconditionally, for two
        reasons. Both scripts are served by Vercel's edge at /_vercel/*, so off
        Vercel they 404 and log a console error — which is a real Best Practices
        regression (100 -> 96, measured) and which would otherwise contaminate
        the Lighthouse record in docs/17 § 3 with a fault that does not exist in
        production. And excluding preview deployments keeps our own testing out
        of the client's numbers; a preview build that gets shared and clicked
        through a dozen times should not look like traffic.
      */}
      {process.env.VERCEL_ENV === "production" && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}
