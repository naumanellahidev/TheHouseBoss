"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Sign out, then hard-navigate to the login screen.
 *
 * A hard navigation rather than router.push: the session cookie just changed,
 * and every cached server component rendered under the old session has to be
 * discarded.
 *
 * This is the only escape route from the 403 screen. A plain link to
 * /admin/login would bounce straight back — middleware sends a signed-in user
 * away from the login page — which is the redirect loop docs/06 § 1 forbids.
 *
 * refresh() after replace() discards every server component rendered under the
 * old session; without it the 403 screen can be served from the router cache.
 */
export function SignOutButton({
  children = "Sign out",
  variant = "outline",
  ...props
}: Omit<ButtonProps, "onClick" | "loading">) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      {...props}
      variant={variant}
      loading={pending}
      loadingLabel="Signing out"
      onClick={async () => {
        setPending(true);
        await createSupabaseBrowserClient().auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      {children}
    </Button>
  );
}
