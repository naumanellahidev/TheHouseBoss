import { OG_SIZE, ogResponse, ogTrim } from "@/lib/seo/og";
import { getListingBySlug } from "@/lib/queries/listings";
import { formatBaths, formatNumber, formatPrice } from "@/lib/utils";

/**
 * The social card for a listing.
 *
 * Renders the price and the address rather than the photograph. A property
 * photo scaled to a 1200x630 card is unreadable, and the price is the thing
 * someone scanning a feed actually reacts to.
 */

export const alt = "Listing on The House Boss";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug).catch(() => null);

  if (!listing) {
    return ogResponse({
      eyebrow: "Central Florida",
      title: "Homes for sale",
      subtitle: "Lake Mary, Longwood, Sanford, Casselberry and Orlando.",
    });
  }

  const sold = listing.status === "sold";
  const price =
    sold && listing.soldPrice != null ? listing.soldPrice : listing.price;

  const facts = [
    listing.beds != null ? `${listing.beds} bed` : null,
    listing.baths != null ? `${formatBaths(listing.baths)} bath` : null,
    listing.sqft != null ? `${formatNumber(listing.sqft)} sq ft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return ogResponse({
    eyebrow: `${sold ? "Sold" : formatPrice(price)} · ${listing.city.name}, FL`,
    title: ogTrim(listing.address, 70),
    subtitle: sold
      ? `Sold for ${formatPrice(price)}`
      : (listing.headline ? ogTrim(listing.headline, 90) : undefined),
    facts: facts || undefined,
  });
}
