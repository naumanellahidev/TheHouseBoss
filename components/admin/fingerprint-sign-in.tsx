"use client";

import * as React from "react";
import { Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

import { Button } from "@/components/ui/button";

/**
 * "Sign in with fingerprint" on the login screen.
 *
 * Only rendered when the browser has WebAuthn. It asks the server for a
 * challenge — naming this device's own passkey when one is remembered, so the
 * phone goes straight to the sensor with no account picker — signs it, and lets
 * the route start the session. On success the session cookies are already set,
 * so a full navigation to `next` lands signed in; a server component then reads
 * a real session rather than a stale client view.
 *
 * It never blocks the password form: a cancel is silent, and any other failure
 * shows a line and leaves the form untouched.
 */
const LOCAL_KEY = "thb-passkey";

export function FingerprintSignIn({ next }: { next?: string }) {
  const [available, setAvailable] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Deferred so the read of a browser-only API is not a synchronous setState
    // in the effect body (and never runs during SSR).
    const timer = window.setTimeout(
      () => setAvailable(!!window.PublicKeyCredential),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      let id: string | null = null;
      try {
        id = localStorage.getItem(LOCAL_KEY);
      } catch {
        /* private window */
      }
      const optionsJSON = await (
        await fetch("/api/auth/passkey/login-options", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(id ? { id } : {}),
        })
      ).json();
      if (optionsJSON.error) throw new Error(optionsJSON.error);

      const response = await startAuthentication({ optionsJSON });
      const res = await fetch("/api/auth/passkey/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fingerprint sign-in failed.");

      // The app lock should not ask again in this fresh session.
      try {
        sessionStorage.setItem("thb-unlocked", "1");
      } catch {
        /* private window */
      }
      window.location.assign(
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/admin",
      );
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setError(
          err instanceof Error ? err.message : "Fingerprint sign-in failed.",
        );
      }
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        block
        loading={busy}
        onClick={signIn}
      >
        <Fingerprint aria-hidden="true" />
        Sign in with fingerprint
      </Button>
      {error ? (
        <p className="text-center text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
