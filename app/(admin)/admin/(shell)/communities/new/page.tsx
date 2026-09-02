import { AdminPageHeader } from "@/components/admin/page-header";
import { CommunityForm } from "@/components/admin/places/community-form";
import { getAdminCities, getKnownAmenities } from "@/lib/queries/admin";

export const metadata = { title: "New community" };

export default async function NewCommunityPage() {
  const [cities, knownAmenities] = await Promise.all([
    getAdminCities(),
    getKnownAmenities(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="New community"
        description="Save it once, then add the photograph and the detail."
      />
      <CommunityForm
        community={null}
        cities={cities}
        knownAmenities={knownAmenities}
      />
    </div>
  );
}
