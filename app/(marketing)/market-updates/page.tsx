import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "lucide-react";

import { ArticleGrid } from "@/components/site/article-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { Disclaimer } from "@/components/site/disclaimer";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticles } from "@/lib/queries/articles";
import { getCities } from "@/lib/queries/cities";
import { safeQuery } from "@/lib/queries/safe";
import { cn } from "@/lib/utils";
import type { City } from "@/types/domain";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Central Florida Market Updates",
  description:
    "What the Lake Mary, Longwood, Sanford, Casselberry and Orlando housing markets are actually doing — with the date every figure was true, and what it means if you are buying or selling.",
  path: "/market-updates",
});

export default async function MarketUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;

  const [articles, cities] = await Promise.all([
    safeQuery(
      () => getArticles({ kind: "market_update", citySlug: city, limit: 48 }),
      [],
      "getArticles(market updates)",
    ),
    safeQuery(() => getCities(), [] as City[], "getCities"),
  ]);

  const crumbs = [{ href: "/market-updates", label: "Market Updates" }];
  const active = cities.find((item) => item.slug === city);

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Market updates</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            What the numbers actually did, and what they mean for someone buying
            or selling right now. Every figure carries the date it was true.
          </p>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container className="flex flex-col gap-6">
          {cities.length > 0 ? (
            <nav aria-label="Filter by city" className="scroll-row gap-2 md:flex-wrap">
              <CityChip href="/market-updates" active={!city}>
                Every city
              </CityChip>
              {cities.map((option) => (
                <CityChip
                  key={option.slug}
                  href={`/market-updates?city=${option.slug}`}
                  active={city === option.slug}
                >
                  {option.name}
                </CityChip>
              ))}
            </nav>
          ) : null}

          {articles.length === 0 ? (
            <EmptyState
              icon={LineChart}
              title={
                active
                  ? `No ${active.name} update published yet`
                  : "The first market update is being written"
              }
              description="Rather than publish a stale figure, nothing goes up until there is something real to say. Ask and I will tell you where the market is today."
              actions={
                <>
                  {active ? (
                    <Button asChild variant="outline">
                      <Link href="/market-updates">All cities</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="accent">
                    <Link href="/contact">Ask about your area</Link>
                  </Button>
                </>
              }
            />
          ) : (
            <ArticleGrid articles={articles} />
          )}

          {/* docs/09 § 6: market pages carry the estimate disclaimer. */}
          <Disclaimer type="estimate" />
        </Container>
      </Section>
    </>
  );
}

function CityChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-accent bg-accent-wash text-foreground"
          : "border-border-strong bg-surface text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
