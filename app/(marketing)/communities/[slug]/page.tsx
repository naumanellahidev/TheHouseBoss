import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { Markdown } from "@/components/site/markdown";
import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { ListingGrid } from "@/components/listing/listing-grid";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, faqJsonLd, placeJsonLd } from "@/lib/seo/jsonld";
import { getSeoOverride } from "@/lib/queries/seo";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  getCommunityBySlug,
  getCommunitySlugsForStaticParams,
} from "@/lib/queries/cities";
import { getListingsByCommunity } from "@/lib/queries/listings";
import { safeQuery } from "@/lib/queries/safe";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";

/**
 * `/communities/[slug]` — docs/05.
 *
 * Hero, intro, HOA, amenities, price range, the homes for sale in it, FAQ and
 * nearby communities. Every block hides itself when empty.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getCommunitySlugsForStaticParams();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug).catch(() => null);

  if (!community) {
    return { title: "Community not found", robots: { index: false, follow: true } };
  }

  const override = await getSeoOverride(`/communities/${community.slug}`);

  return buildMetadata({
    override,
    title: community.metaTitle || `${community.name}, ${community.city.name} FL`,
    // Same floor as the city pages: a stored description under 140 characters
    // gets padded by search engines with whatever text they find instead.
    description:
      community.metaDesc && community.metaDesc.length >= 140
        ? community.metaDesc
        : `${community.name} in ${community.city.name}, Florida — HOA detail, amenities, typical prices and every home currently for sale in the community, from a Realtor and licensed contractor.`,
    path: `/communities/${community.slug}`,
  });
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const community = await safeQuery(
    () => getCommunityBySlug(slug),
    null,
    "getCommunityBySlug",
  );
  if (!community) notFound();

  const [listings, siblings] = await Promise.all([
    safeQuery(
      () => getListingsByCommunity(community.id, 6),
      [],
      "getListingsByCommunity",
    ),
    safeQuery(
      () => import("@/lib/queries/cities").then((m) => m.getCommunities(community.city.slug)),
      [],
      "getCommunities(siblings)",
    ),
  ]);

  const crumbs = [
    { href: `/${community.city.slug}`, label: community.city.name },
    ...(community.city.slug === "lake-mary"
      ? [{ href: "/lake-mary/communities", label: "Communities" }]
      : []),
    { href: `/communities/${community.slug}`, label: community.name },
  ];

  const nearby = siblings.filter((item) => item.id !== community.id).slice(0, 4);

  return (
    <>
      <JsonLd
        data={[
          placeJsonLd({
            name: community.name,
            slug: `communities/${community.slug}`,
            metaDesc: community.metaDesc,
            introMd: community.introMd,
          }),
          faqJsonLd(community.faq),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <Section className="pb-0">
        <Container className="flex flex-col gap-5">
          <Breadcrumbs items={crumbs} />

          <div className="flex max-w-[62ch] flex-col gap-3">
            <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
              {community.city.name}, Florida
            </p>
            <h1 className="text-h1">{community.name}</h1>
          </div>

          {community.heroKey ? (
            <PropertyImage
              photo={{
                kind: "stored",
                key: community.heroKey,
                w: 1920,
                h: 820,
                alt: community.heroAlt ?? "",
              }}
              size={1600}
              sizes={IMAGE_SIZES.fullBleed}
              priority
              aspect="21/9"
              wrapperClassName="rounded-lg"
            />
          ) : null}
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          {community.introMd ? <Markdown lead>{community.introMd}</Markdown> : null}

          {(community.hoaInfo ||
            community.amenities.length > 0 ||
            community.priceRange) ? (
            <div className="grid gap-6 md:grid-cols-2">
              {community.hoaInfo ? (
                <section
                  aria-labelledby="hoa-heading"
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
                >
                  <h2 id="hoa-heading" className="text-h4">
                    HOA
                  </h2>
                  <p className="text-body leading-relaxed text-foreground-muted">
                    {community.hoaInfo}
                  </p>
                </section>
              ) : null}

              {community.amenities.length > 0 ? (
                <section
                  aria-labelledby="amenities-heading"
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
                >
                  <h2 id="amenities-heading" className="text-h4">
                    Amenities
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {community.amenities.map((amenity) => (
                      <li
                        key={amenity}
                        className="rounded-sm bg-surface-sunken px-2.5 py-1 text-sm text-foreground-muted"
                      >
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {community.priceRange?.min || community.priceRange?.max ? (
                <section
                  aria-labelledby="prices-heading"
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
                >
                  <h2 id="prices-heading" className="text-h4">
                    Typical prices
                  </h2>
                  <p className="text-body text-foreground-muted tabular">
                    {community.priceRange.min
                      ? formatPrice(community.priceRange.min)
                      : "—"}
                    {" to "}
                    {community.priceRange.max
                      ? formatPrice(community.priceRange.max)
                      : "—"}
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    A guide, not an appraisal. What a specific home is worth
                    depends on its condition — ask and I will look at it.
                  </p>
                </section>
              ) : null}
            </div>
          ) : null}

          {community.bodyMd ? <Markdown>{community.bodyMd}</Markdown> : null}
        </Container>
      </Section>

      {listings.length > 0 ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-6">
            <SectionHeader
              overline="For sale"
              title={`Homes for sale in ${community.name}`}
            />
            <ListingGrid listings={listings} />
          </Container>
        </Section>
      ) : null}

      {community.faq.length > 0 ? (
        <Section>
          <Container className="flex max-w-[68ch] flex-col gap-6">
            <h2 className="text-h2">Common questions about {community.name}</h2>
            <FaqAccordion items={community.faq} defaultOpenFirst />
          </Container>
        </Section>
      ) : null}

      {nearby.length > 0 ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-4">
            <h2 className="text-h3">Nearby communities</h2>
            <ul className="flex flex-wrap gap-2">
              {nearby.map((item) => (
                <li key={item.id}>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/communities/${item.slug}`}>{item.name}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container className="max-w-[68ch]">
          <LeadForm
            leadType="general"
            heading={`Interested in ${community.name}?`}
            description="Tell me what you are looking for and I will tell you what actually comes up there, and what it goes for."
            compact
            submitLabel="Send message"
          />
        </Container>
      </Section>
    </>
  );
}
