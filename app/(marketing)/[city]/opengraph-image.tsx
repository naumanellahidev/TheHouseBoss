import { OG_SIZE, ogResponse, ogTrim } from "@/lib/seo/og";
import { getCityBySlug } from "@/lib/queries/cities";

export const alt = "Central Florida city guide from The House Boss";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug).catch(() => null);

  if (!city) {
    return ogResponse({
      eyebrow: "Central Florida",
      title: "Neighbourhood guides",
    });
  }

  return ogResponse({
    eyebrow: `${city.county} County, Florida`,
    title: `${city.name} real estate`,
    subtitle: city.metaDesc
      ? ogTrim(city.metaDesc, 110)
      : `Homes, communities and a local guide to ${city.name}.`,
  });
}
