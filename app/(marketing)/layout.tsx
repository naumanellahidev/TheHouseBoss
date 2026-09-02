import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { JsonLd } from "@/components/site/json-ld";
import { agentJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

/**
 * Public marketing shell. The compliance footer is rendered inside <Footer />,
 * so every page in this group carries the legally required disclosure
 * (CLAUDE.md hard rule 15).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/*
        RealEstateAgent + WebSite ride on every public page, so the entity graph
        is present wherever a crawler lands rather than only on /about.
        Page-level graphs (Person, Article, FAQPage, BreadcrumbList) are added by
        the pages themselves and resolve against these by @id.
      */}
      <JsonLd data={[agentJsonLd(), websiteJsonLd()]} />

      {/* WCAG 2.4.1 — must be the first focusable element on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-fg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
    </>
  );
}
