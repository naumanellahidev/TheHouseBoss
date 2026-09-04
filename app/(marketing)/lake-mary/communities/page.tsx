import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCommunities } from "@/lib/queries/cities";
import { safeQuery } from "@/lib/queries/safe";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Lake Mary Communities & Neighbourhoods",
  description:
    "The named communities and neighbourhoods of Lake Mary, Florida — Heathrow and the rest — with HOA detail, amenities and the homes currently for sale in each.",
  path: "/lake-mary/communities",
});

export default async function LakeMaryCommunitiesPage() {
  const communities = await safeQuery(
    () => getCommunities("lake-mary"),
    [],
    "getCommunities(lake-mary)",
  );

  const crumbs = [
    { href: "/lake-mary", label: "Lake Mary" },
    { href: "/lake-mary/communities", label: "Communities" },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Lake Mary communities</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            People rarely search for a city. They search for a neighbourhood —
            Heathrow, Magnolia Plantation, the street their friend lives on.
            Each of these has its own page.
          </p>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container>
          {communities.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Community pages are on the way"
              description="In the meantime, every Lake Mary home I represent is on the homes-for-sale page."
              actions={
                <Button asChild variant="accent">
                  <Link href="/lake-mary/homes-for-sale">See Lake Mary homes</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {communities.map((community) => (
                <li key={community.id}>
                  <Link
                    href={`/communities/${community.slug}`}
                    className={cn(
                      "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
                      "transition-[box-shadow,transform] duration-(--dur-base)",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    {community.heroKey ? (
                      <PropertyImage
                        photo={{
                          kind: "stored",
                          key: community.heroKey,
                          w: 1200,
                          h: 900,
                          alt: community.heroAlt ?? "",
                        }}
                        size={800}
                        sizes={IMAGE_SIZES.cardGrid3}
                        aspect="4/3"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex aspect-4/3 items-center justify-center bg-surface-sunken text-accent-quiet"
                      >
                        <MapPinned className="size-10" />
                      </span>
                    )}

                    <span className="flex flex-1 flex-col gap-2 p-5">
                      <span className="text-h4 font-semibold text-foreground">
                        {community.name}
                      </span>
                      {community.introMd ? (
                        <span className="line-clamp-3 text-sm leading-relaxed text-foreground-muted">
                          {community.introMd.replace(/[#*_>[\]()]/g, "").slice(0, 160)}
                        </span>
                      ) : null}
                      {community.priceRange?.min ? (
                        <span className="mt-auto border-t border-border pt-3 text-sm text-foreground-muted tabular">
                          Typically from{" "}
                          {formatPrice(community.priceRange.min, { compact: true })}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
