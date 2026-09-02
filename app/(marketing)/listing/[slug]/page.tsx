import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { AgentCard } from "@/components/listing/agent-card";
import { ArchivedPhotos, Gallery } from "@/components/listing/gallery";
import {
  ContractorsTake,
  FeatureList,
  KeyFacts,
} from "@/components/listing/listing-facts";
import { ListingGrid } from "@/components/listing/listing-grid";
import { StickyActionBar } from "@/components/listing/sticky-action-bar";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { Disclaimer } from "@/components/site/disclaimer";
import { JsonLd } from "@/components/site/json-ld";
import { Badge, listingStatusBadge } from "@/components/ui/badge";
import {
  getListingBySlug,
  getListingSlugsForStaticParams,
  getSimilarListings,
  resolveRedirect,
} from "@/lib/queries/listings";
import { breadcrumbJsonLd, listingJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { photoUrl } from "@/lib/storage/url";
import { formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import type { Listing } from "@/types/domain";

/**
 * Listing detail — the eleven sections in docs/05.
 *
 * Two hard rules shape this page:
 *
 *  HR11  a published URL is PERMANENT. A slug that no longer resolves is looked
 *        up in the `redirects` table before 404ing, and the trigger that writes
 *        those rows fires whenever a live slug changes. The lookup happens on
 *        the miss path only, so a normal request pays nothing for it
 *        (docs/01, Redirect resolution).
 *  HR10  a sold listing keeps its page forever. After the 7-day purge the
 *        gallery is replaced by the surviving 400w cover and a note; the
 *        description, the sold price and the URL all stay.
 *
 * DO NOT add a `loading.tsx` for this route, and never restore the app-root one
 * Phase 0 shipped. A loading file makes the segment stream, which flushes a 200
 * status header before this component runs — after which `notFound()` can no
 * longer set 404, and a missing listing answers 200 with a "not found" page.
 * A soft 404 is a real SEO defect, and it is the exact inverse of HR11: a URL
 * that was never published has to say so with a real status code.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getListingSlugsForStaticParams();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // No database at build time is not a build failure — pages render on demand.
    return [];
  }
}

async function load(slug: string): Promise<Listing | null> {
  try {
    return await getListingBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await load(slug);

  if (!listing) {
    return { title: "Listing not found", robots: { index: false, follow: true } };
  }

  const cover = listing.photos[0];
  const price =
    listing.status === "sold" && listing.soldPrice != null
      ? listing.soldPrice
      : listing.price;

  return buildMetadata({
    title:
      listing.metaTitle ||
      `${listing.address}, ${listing.city.name}, FL — ${formatPrice(price)}`,
    description:
      listing.metaDesc ||
      listing.description?.slice(0, 155) ||
      `${listing.address} in ${listing.city.name}, Florida. ${formatPrice(price)}.`,
    path: `/listing/${listing.slug}`,
    image: cover ? photoUrl(cover, 1600) : undefined,
    type: "article",
    publishedTime: listing.publishedAt ?? undefined,
    modifiedTime: listing.updatedAt,
  });
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await load(slug);

  if (!listing) {
    // HR11: only now, on the miss path, do we consult the redirects table.
    // permanentRedirect() answers 308, which Google treats exactly as it treats
    // 301 and which additionally preserves the request method.
    const target = await resolveRedirect(`/listing/${slug}`).catch(() => null);
    if (target) {
      if (target.permanent) permanentRedirect(target.toPath);
      redirect(target.toPath);
    }
    notFound();
  }

  const sold = listing.status === "sold";
  const badge = listingStatusBadge[listing.status];
  const price = sold && listing.soldPrice != null ? listing.soldPrice : listing.price;

  const similar = await getSimilarListings(listing, 3).catch(() => []);

  const crumbs = [
    { href: `/${listing.city.slug}/homes-for-sale`, label: `${listing.city.name} Homes for Sale` },
    { href: `/listing/${listing.slug}`, label: listing.address },
  ];

  const FORM_ID = "listing-contact";

  return (
    <>
      <JsonLd
        data={[
          listingJsonLd(
            listing,
            listing.photos.slice(0, 6).map((photo) => photoUrl(photo, 1600)),
          ),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <Section className="pb-0">
        <Container className="flex flex-col gap-5">
          {/* 1. Breadcrumb */}
          <Breadcrumbs items={crumbs} />

          {/* 2. Gallery — or the archive note once the photos are purged */}
          {listing.photosPurged ? (
            <ArchivedPhotos
              cover={listing.photos[0] ?? null}
              address={listing.address}
            />
          ) : (
            <Gallery photos={listing.photos} address={listing.address} />
          )}
        </Container>
      </Section>

      <Section className="pt-8">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-10 lg:col-span-8">
            {/* 3. Price, address, status */}
            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {listing.mlsNumber ? (
                  <span className="text-xs text-foreground-subtle">
                    MLS {listing.mlsNumber}
                  </span>
                ) : null}
              </div>

              <p className="font-display text-h1 font-semibold text-foreground tabular">
                {formatPrice(price)}
              </p>

              {sold ? (
                <p className="text-sm text-foreground-muted">
                  Sold{listing.soldAt ? ` on ${formatDate(listing.soldAt)}` : ""}
                  {listing.soldPrice != null && listing.soldPrice !== listing.price
                    ? ` · listed at ${formatPrice(listing.price)}`
                    : ""}
                </p>
              ) : null}

              <h1 className="text-h3 text-foreground">
                {listing.address}
                {listing.unit ? `, ${listing.unit}` : ""}
              </h1>
              <p className="text-lead text-foreground-muted">
                {listing.city.name}, FL{listing.zip ? ` ${listing.zip}` : ""}
                {listing.community ? ` · ${listing.community.name}` : ""}
              </p>
            </header>

            {/* 4. Key facts */}
            <KeyFacts listing={listing} />

            {/* 5. Description */}
            {listing.headline || listing.description ? (
              <section aria-labelledby="about-heading" className="flex flex-col gap-4">
                <h2 id="about-heading" className="text-h2">
                  {listing.headline || "About this home"}
                </h2>
                {listing.description ? (
                  <div className="flex max-w-[68ch] flex-col gap-4 text-lead leading-relaxed text-foreground-muted">
                    {listing.description
                      .split(/\n{2,}/)
                      .map((paragraph) => paragraph.trim())
                      .filter(Boolean)
                      .map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 6. Features */}
            {listing.features.length > 0 ? (
              <section aria-labelledby="features-heading" className="flex flex-col gap-4">
                <h2 id="features-heading" className="text-h3">
                  Features
                </h2>
                <FeatureList features={listing.features} />
              </section>
            ) : null}

            {/* 7. The Contractor's Take — the differentiator */}
            <ContractorsTake text={listing.contractorsTake} />
            {listing.contractorsTake ? <Disclaimer type="construction" /> : null}

            {/* 8. Location */}
            <section aria-labelledby="location-heading" className="flex flex-col gap-4">
              <h2 id="location-heading" className="text-h3">
                Location
              </h2>
              <p className="flex items-start gap-2 text-body text-foreground-muted">
                <MapPin className="mt-1 size-4 shrink-0 text-accent-quiet" aria-hidden="true" />
                <span>
                  {listing.address}
                  {listing.unit ? `, ${listing.unit}` : ""}, {listing.city.name}, FL
                  {listing.zip ? ` ${listing.zip}` : ""}
                </span>
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link
                  href={`/${listing.city.slug}`}
                  className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                >
                  About {listing.city.name}
                </Link>
                <Link
                  href={`/${listing.city.slug}/homes-for-sale`}
                  className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                >
                  All homes in {listing.city.name}
                </Link>
                {listing.community ? (
                  <Link
                    href={`/communities/${listing.community.slug}`}
                    className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                  >
                    {listing.community.name}
                  </Link>
                ) : null}
              </p>
              {/* A static map needs a keyed tile provider, which is a Phase 7
                  decision (docs/12). Until then the address and the city links
                  are shown rather than an empty grey box. */}
            </section>

            {/* 9. Contact — inline copy, mirrored by the sticky column */}
            <section id={FORM_ID} aria-labelledby="contact-heading" className="lg:hidden">
              <h2 id="contact-heading" className="sr-only">
                Contact
              </h2>
              <AgentCard listingId={listing.id} soldOut={sold} />
            </section>

            {/* 11. Compliance */}
            <Disclaimer type="legal" />
          </div>

          {/* 9. Sticky contact card, desktop */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-[calc(var(--header-h-lg)+1.5rem)] max-h-[calc(100svh-var(--header-h-lg)-3rem)] overflow-y-auto">
              <AgentCard listingId={listing.id} soldOut={sold} />
            </div>
          </aside>
        </Container>
      </Section>

      {/* 10. Similar listings */}
      {similar.length > 0 ? (
        <Section tone="sunken" className="pb-28 lg:pb-16">
          <Container className="flex flex-col gap-6">
            <h2 className="text-h2">
              {sold ? "Homes like this one" : "Similar homes nearby"}
            </h2>
            <ListingGrid listings={similar} />
          </Container>
        </Section>
      ) : (
        <div className="pb-28 lg:pb-0" />
      )}

      <StickyActionBar price={price} sold={sold} formId={FORM_ID} />
    </>
  );
}
