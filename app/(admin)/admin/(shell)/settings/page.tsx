import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { getAdminIdentity, ROLE_LABELS } from "@/lib/auth/permissions";
import { getAdminSettings } from "@/lib/queries/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

/*
  Account & Security reads the signed-in user, so this page cannot be cached
  across requests — two admins would otherwise see each other's account panel.
*/
export const dynamic = "force-dynamic";

/**
 * Settings — docs/06 § 10, extended with Account & Security (brief §47–§51).
 *
 * One row, `site_settings.id = 1`. Anything left blank falls back to the
 * compile-time values in lib/site-config.ts, and a value that is still the
 * PENDING sentinel there causes the block to be hidden on the public site
 * rather than rendered with a placeholder.
 *
 * The account panel is different in kind from the rest of this screen: the
 * others edit the SITE, it edits the person signed in. It is a tab here rather
 * than its own route because that is where anyone looks for it, and because
 * splitting it out would leave a settings page that cannot change a password.
 */
export default async function AdminSettingsPage() {
  const [settings, identity] = await Promise.all([
    getAdminSettings(),
    getAdminIdentity(),
  ]);

  /*
    The email comes from the auth user, not from `profiles`.

    `profiles` mirrors a display name and a role; the address someone actually
    signs in with lives in `auth.users` and is the one the account panel must
    show. Reading the mirror would display a stale address after a change and
    quietly tell the operator their email is something it is not.
  */
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Settings"
        description="Contact details, branding, your own account, compliance text and where enquiries are sent. Anything left blank falls back to the values built into the site."
      />
      <SettingsForm
        settings={settings}
        account={
          /*
            `identity.username` is nullable — an admin created through Supabase
            Auth directly has an email and no username until one is set. The
            panel needs a value to prefill, and the empty string is the honest
            one: it renders an empty field the operator can fill in, which is
            exactly the state they are in.
          */
          identity
            ? {
                username: identity.username ?? "",
                email: user?.email ?? "",
                role: ROLE_LABELS[identity.role] ?? identity.role,
              }
            : null
        }
      />
    </div>
  );
}
