import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ListingForm } from "@/components/admin/listings/listing-form";
import { KeywordPanel } from "@/components/admin/seo/keyword-panel";
import { RecordSeoActions } from "@/components/admin/seo/record-seo-actions";
import { Badge, listingStatusBadge } from "@/components/ui/badge";
import { getAdminCities, getAdminCommunities, getAdminListingById, getKnownFeatures } from "@/lib/queries/admin";
import { getListingKeywords, getListingSeoRuns } from "@/lib/queries/platform";

import type { ListingInput } from "@/lib/validation/listing";

export const metadata = { title: "Edit listing" };

/**
 * Edit a listing.
 *
 * The row is mapped back into the exact shape `listingSchema` expects, so the
 * form, the autosave and the server action all speak the same language. Any
 * divergence here would show up as a validation error on a listing that is
 * already live, which is the worst place to find it.
 */
export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [listing, cities, communities, knownFeatures, keywords, seoRuns] =
    await Promise.all([
      getAdminListingById(id),
      getAdminCities(),
      getAdminCommunities(),
      getKnownFeatures(),
      // The engine's output for this listing, for the review surface (§32, §85).
      getListingKeywords(id),
      getListingSeoRuns(id),
    ]);

  if (!listing) notFound();

  const initial = {
    slug: listing.slug,
    status: listing.status,
    listingType: listing.listingType,
    propertyType: listing.propertyType,
    price: listing.price,
    hoaFee: listing.hoaFee,
    taxesAnnual: listing.taxesAnnual,
    beds: listing.beds,
    baths: listing.baths,
    halfBaths: listing.halfBaths,
    sqft: listing.sqft,
    lotSize: listing.lotSize,
    yearBuilt: listing.yearBuilt,
    garageSpaces: listing.garageSpaces,
    stories: listing.stories,
    pool: listing.pool,
    waterfront: listing.waterfront,
    features: listing.features,
    address: listing.address,
    unit: listing.unit,
    cityId: listing.city.id,
    communityId: listing.community?.id ?? null,
    zip: listing.zip,
    lat: listing.lat,
    lng: listing.lng,
    headline: listing.headline,
    description: listing.description,
    contractorsTake: listing.contractorsTake,
    photos: listing.photos,
    virtualTour: listing.virtualTour,
    metaTitle: listing.metaTitle,
    metaDesc: listing.metaDesc,
    isFeatured: listing.isFeatured,
    published: listing.published,
    soldAt: listing.soldAt ? new Date(listing.soldAt) : null,
    soldPrice: listing.soldPrice,
    keepPhotos: listing.keepPhotos,
  } as unknown as ListingInput;

  const badge = listingStatusBadge[listing.status];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={listing.address}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <Badge tone={listing.published ? "active" : "neutral"}>
              {listing.published ? "Live" : "Draft"}
            </Badge>
            <span>
              {listing.city.name}, FL · /listing/{listing.slug}
            </span>
          </span>
        }
      />

      <ListingForm
        listingId={listing.id}
        initial={initial}
        cities={cities}
        communities={communities}
        knownFeatures={knownFeatures}
        publishedAt={listing.publishedAt}
        initialTab={tab}
      />

      {/*
        Below the form, not inside it.

        The engine's output is not a field: it is derived from what the form
        contains and is rewritten whenever the listing is published. Putting it
        in a tab would imply it can be edited there, and putting it inside the
        <form> would submit it back on every save.
      */}
      <section className="flex flex-col gap-6 border-t border-border pt-8">
        {/*
          §92. The controls sit above their own output, so pressing one and
          seeing what it produced is a single glance rather than a scroll.
        */}
        <RecordSeoActions
          listingId={listing.id}
          photosMissingAlt={
            listing.photos.filter((photo) => !photo.alt?.trim()).length
          }
        />
        <KeywordPanel keywords={keywords} runs={seoRuns} />
      </section>
    </div>
  );
}
