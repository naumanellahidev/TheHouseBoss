import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/admin/login-form";
import { UsernameLoginForm } from "@/components/admin/username-login-form";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * The only unauthenticated route inside (admin).
 *
 * It provides its own <main> landmark because the admin layout's shell — the
 * sidebar, the storage meter, the user menu — is meaningless to someone who is
 * not signed in yet, so the layout renders the login tree bare.
 */
/**
 * Messages this screen is willing to display, keyed by a parameter.
 *
 * Deliberately a closed set. See the note at the render site.
 */
const REASONS: Record<string, string> = {
  "password-changed":
    "Your password was changed, so every device was signed out — including this one. Sign in with your new password.",
  "signed-out-everywhere":
    "You signed out on every device. Sign in again to continue.",
  expired: "Your session expired. Sign in again to continue.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const params = await searchParams;

  // Only same-site paths survive: a `next` of https://evil.example would
  // otherwise be handed straight to the auth callback.
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface-sunken px-5 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* The stacked lockup already carries "Powered by {brokerage}", so
              the heading below does not repeat it. */}
          <Logo variant="stacked" href={null} />
          <h1 className="text-h3">Dashboard sign-in</h1>

          {/*
            Why you are here, when you did not expect to be.

            Changing a password revokes every session including the one that
            changed it (brief §49), so the operator lands back on this screen a
            second after a successful action. Without this line that reads as a
            failure — the natural conclusion is that the change did not work
            and the natural next step is to try it again.

            A fixed lookup rather than rendering the parameter: `reason` comes
            from the URL, and echoing a URL parameter into the page is how a
            sign-in screen ends up displaying an attacker's sentence above a
            password field.
          */}
          {REASONS[params.reason ?? ""] ? (
            <p className="rounded-md border border-info/30 bg-info-bg px-4 py-3 text-sm text-foreground">
              {REASONS[params.reason ?? ""]}
            </p>
          ) : null}
        </div>

        <UsernameLoginForm next={next} error={params.error} />

        {/*
          Magic link is kept as a second route in, not replaced.

          It is the recovery path: if a password is forgotten or an account is
          locked out by the login rate limiter, an emailed link still gets the
          administrator in without anyone handling a password. Removing it would
          leave a single point of failure on a site with one operator.
        */}
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-foreground-subtle uppercase">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center text-sm font-semibold text-accent-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Email me a sign-in link instead
          </summary>
          <div className="pt-4">
            <LoginForm next={next} linkError={params.error === "link"} />
          </div>
        </details>

        <p className="text-center text-xs text-foreground-subtle">
          <Link
            href="/"
            className="rounded-sm underline underline-offset-4 hover:text-foreground"
          >
            Back to the public site
          </Link>
        </p>
      </div>
    </main>
  );
}
