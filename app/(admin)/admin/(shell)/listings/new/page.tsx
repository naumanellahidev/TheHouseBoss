import { AdminPageHeader } from "@/components/admin/page-header";
import { ListingForm } from "@/components/admin/listings/listing-form";
import { getAdminCities, getAdminCommunities, getKnownFeatures } from "@/lib/queries/admin";

import type { ListingInput } from "@/lib/validation/listing";

export const metadata = { title: "New listing" };

/**
 * Create a listing.
 *
 * No row is written until the first save. That is why the Media section is
 * disabled here: photo keys are `listings/{listingId}/…` (docs/07 § 3), so
 * there is nowhere to file them until the listing exists. Creating a draft row
 * on page load would avoid that at the cost of an abandoned row every time she
 * opens this page and changes her mind.
 */
export default async function NewListingPage() {
  const [cities, communities, knownFeatures] = await Promise.all([
    getAdminCities(),
    getAdminCommunities(),
    getKnownFeatures(),
  ]);

  const lakeMary = cities.find((city) => city.slug === "lake-mary");

  const initial = {
    slug: "",
    status: "active",
    listingType: "resale",
    propertyType: "single_family",
    price: 0,
    beds: null,
    baths: null,
    halfBaths: 0,
    sqft: null,
    lotSize: null,
    yearBuilt: null,
    garageSpaces: 0,
    stories: null,
    pool: false,
    waterfront: false,
    features: [],
    address: "",
    unit: null,
    // Lake Mary is the flagship city and the majority of her listings; a
    // sensible default beats an empty select she has to open every time.
    cityId: lakeMary?.id ?? cities[0]?.id ?? "",
    communityId: null,
    zip: null,
    lat: null,
    lng: null,
    headline: null,
    description: null,
    contractorsTake: null,
    photos: [],
    virtualTour: null,
    metaTitle: null,
    metaDesc: null,
    isFeatured: false,
    published: false,
    soldAt: null,
    soldPrice: null,
    keepPhotos: false,
    hoaFee: null,
    taxesAnnual: null,
  } as unknown as ListingInput;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="New listing"
        description="Fill in the basics and save a draft. Photos can be added as soon as the draft exists."
      />
      <ListingForm
        listingId={null}
        initial={initial}
        cities={cities}
        communities={communities}
        knownFeatures={knownFeatures}
      />
    </div>
  );
}
