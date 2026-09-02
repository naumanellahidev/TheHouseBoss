import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { getAdminSettings } from "@/lib/queries/settings";

export const metadata = { title: "Settings" };

/**
 * Settings — docs/06 § 10.
 *
 * One row, `site_settings.id = 1`. Anything left blank falls back to the
 * compile-time values in lib/site-config.ts, and a value that is still the
 * PENDING sentinel there causes the block to be hidden on the public site
 * rather than rendered with a placeholder.
 */
export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Settings"
        description="Contact details, profile links, compliance text and where enquiries are sent. Anything left blank falls back to the values built into the site."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
