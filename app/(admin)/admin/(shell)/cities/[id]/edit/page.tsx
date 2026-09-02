import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { CityForm } from "@/components/admin/places/city-form";
import { Badge } from "@/components/ui/badge";
import { getAdminCityById } from "@/lib/queries/admin";

export const metadata = { title: "Edit city" };

export default async function EditCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const city = await getAdminCityById(id);
  if (!city) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={city.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={city.published ? "active" : "neutral"}>
              {city.published ? "Published" : "Draft"}
            </Badge>
            <span>
              {city.county} County · /{city.slug}
            </span>
          </span>
        }
      />
      <CityForm city={city} />
    </div>
  );
}
