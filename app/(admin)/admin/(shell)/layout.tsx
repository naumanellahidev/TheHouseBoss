import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { StorageMeter } from "@/components/admin/storage-meter";
import { storageLevel } from "@/lib/storage/budget";
import { Button } from "@/components/ui/button";
import { countNewLeads } from "@/lib/queries/leads";
import { getStorageUsage } from "@/lib/queries/media";
import { getAdminProfile, getCurrentUser } from "@/lib/supabase/server";

/**
 * Layer 2 of the three-layer auth check (docs/01 § Auth):
 *
 *   1. middleware  — redirects an anonymous request to /admin/login
 *   2. THIS LAYOUT — checks profiles.role = 'admin'
 *   3. RLS         — the database refuses the write regardless of both
 *
 * Layer 2 exists because layer 1 only proves someone is signed in. A signed-in
 * non-admin gets a plain 403 here, never a redirect loop back to a login screen
 * they have already passed (docs/06 § 1).
 *
 * This layout sits inside the (shell) route group so that /admin/login and the
 * magic-link callback — which must work for a signed-out visitor — do not
 * inherit it.
 */
export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminProfile();

  if (!admin) {
    const user = await getCurrentUser();
    // Not signed in at all: middleware normally catches this, but a session
    // that expires between the middleware check and here would land here.
    if (!user) redirect("/admin/login");
    return <Forbidden email={user.email ?? ""} />;
  }

  // Both are admin-only reads and both are cheap; running them in parallel
  // keeps the shell off the critical path of the page inside it.
  const [newLeads, usage] = await Promise.all([
    countNewLeads(),
    getStorageUsage(),
  ]);

  const percent = Math.min(
    100,
    Math.round((usage.totalBytes / usage.limitBytes) * 100),
  );

  return (
    <AdminShell
      newLeads={newLeads}
      userEmail={admin.user.email ?? ""}
      userName={(admin.profile as { full_name?: string | null }).full_name ?? null}
      storage={<StorageMeter usage={usage} variant="sidebar" />}
      storagePercent={percent}
      storageBar={storageLevel(usage).bar}
    >
      {children}
    </AdminShell>
  );
}

/** A plain 403. Not a redirect — see the note above. */
function Forbidden({ email }: { email: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-sunken px-5 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-warning-bg text-warning"
      >
        <ShieldAlert className="size-6" />
      </span>

      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-h2">This account cannot access the dashboard</h1>
        <p className="text-body text-foreground-muted">
          {email ? (
            <>
              You are signed in as{" "}
              <span className="font-medium text-foreground">{email}</span>, which
              is not an administrator on this site.
            </>
          ) : (
            "This account is not an administrator on this site."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="primary">
          <Link href="/">Go to the public site</Link>
        </Button>
        <SignOutButton>Sign in with another account</SignOutButton>
      </div>
    </main>
  );
}
