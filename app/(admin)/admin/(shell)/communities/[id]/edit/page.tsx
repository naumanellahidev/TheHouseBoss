import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { CommunityForm } from "@/components/admin/places/community-form";
import { Badge } from "@/components/ui/badge";
import { getAdminCities, getAdminCommunityById, getKnownAmenities } from "@/lib/queries/admin";

export const metadata = { title: "Edit community" };

export default async function EditCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [community, cities, knownAmenities] = await Promise.all([
    getAdminCommunityById(id),
    getAdminCities(),
    getKnownAmenities(),
  ]);

  if (!community) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={community.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={community.published ? "active" : "neutral"}>
              {community.published ? "Published" : "Draft"}
            </Badge>
            <span>
              {community.city.name} · /communities/{community.slug}
            </span>
          </span>
        }
      />
      <CommunityForm
        community={community}
        cities={cities}
        knownAmenities={knownAmenities}
      />
    </div>
  );
}
