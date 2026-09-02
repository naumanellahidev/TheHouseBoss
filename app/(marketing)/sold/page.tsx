import Link from "next/link";
import type { Metadata } from "next";
import { Home } from "lucide-react";

import { ListingGrid } from "@/components/listing/listing-grid";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, listingItemListJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSoldListings } from "@/lib/queries/listings";
import { getCities } from "@/lib/queries/cities";
import { safeQuery } from "@/lib/queries/safe";
import { cn } from "@/lib/utils";
import type { City } from "@/types/domain";

/**
 * `/sold` — docs/05.
 *
 * Not in the client's original page list. It exists because sold listing pages
 * are kept live forever (HR10/HR11) and a permanent page with no index is a
 * page nothing links to. Sellers read this as proof of track record, and it is
 * the page an assistant can cite when asked what she has actually closed.
 */

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Recently Sold Homes in Central Florida",
  description:
    "Homes recently sold with The House Boss across Lake Mary, Longwood, Sanford, Casselberry and Orlando — the closed transactions behind the advice on this site.",
  path: "/sold",
});

export default async function SoldPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;

  const [listings, cities] = await Promise.all([
    safeQuery(() => getSoldListings(city, 48), [], "getSoldListings"),
    safeQuery(() => getCities(), [] as City[], "getCities"),
  ]);

  const crumbs = [{ href: "/sold", label: "Recently Sold" }];
  const active = cities.find((c) => c.slug === city);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          listingItemListJsonLd(
            listings.map((l) => ({ slug: l.slug, address: l.address })),
            "/sold",
          ),
        ]}
      />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Recently sold</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            Closed transactions, newest first. Every one of these pages stays
            live — the record of what a home actually sold for is more useful
            than the record of what it was listed at.
          </p>
        </Container>
      </Section>

      <Section className="pt-6">
        <Container className="flex flex-col gap-6">
          {cities.length > 0 ? (
            <nav aria-label="Filter by city" className="scroll-row gap-2 md:flex-wrap">
              <CityChip href="/sold" active={!city}>
                All cities
              </CityChip>
              {cities.map((option) => (
                <CityChip
                  key={option.slug}
                  href={`/sold?city=${option.slug}`}
                  active={city === option.slug}
                >
                  {option.name}
                </CityChip>
              ))}
            </nav>
          ) : null}

          <p aria-live="polite" className="text-sm text-foreground-muted">
            <span className="font-semibold text-foreground tabular">
              {listings.length}
            </span>{" "}
            sold {listings.length === 1 ? "home" : "homes"}
            {active ? ` in ${active.name}` : ""}
          </p>

          {listings.length === 0 ? (
            <EmptyState
              icon={Home}
              title={
                active
                  ? `No sold homes listed in ${active.name} yet`
                  : "The sold archive is still filling up"
              }
              description={
                active
                  ? "Try another city, or ask what has closed nearby recently — not every transaction is published here."
                  : "Sold listings appear here as transactions close. In the meantime, the homes currently for sale are the better place to start."
              }
              actions={
                <>
                  {active ? (
                    <Button asChild variant="outline">
                      <Link href="/sold">See every sold home</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="accent">
                    <Link href="/search">Browse homes for sale</Link>
                  </Button>
                </>
              }
            />
          ) : (
            <ListingGrid listings={listings} />
          )}
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
