"use client";

import * as React from "react";
import { Fingerprint } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";

/**
 * The installed-app lock.
 *
 * When the dashboard is opened as an installed app and this device has a
 * fingerprint registered, it is covered by a full-screen lock until the finger
 * is read — on launch and again after five minutes in the background. The check
 * is `navigator.credentials.get` against this device's own credential, so it
 * runs entirely on the phone and works with no connection; the Supabase session
 * cookie is untouched underneath, so unlocking is instant.
 *
 * It is not a second authentication — the session already proves who this is.
 * It is the lock screen a banking app puts in front of an already-signed-in
 * account, so a borrowed or snatched unlocked phone does not open the business.
 * In a normal browser tab it does nothing; the password screen covers that.
 */
const LOCAL_KEY = "thb-passkey";
const RELOCK_AFTER_MS = 5 * 60 * 1000;

function fromBase64url(value: string): ArrayBuffer {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function AppLock() {
  const [credentialId, setCredentialId] = React.useState<string | null>(null);
  const [locked, setLocked] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hiddenAt = React.useRef(0);

  const unlock = React.useCallback(async () => {
    if (!credentialId) return;
    setError(null);
    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: location.hostname.replace(/^www\./, ""),
          // Only this device's own fingerprint: no account picker, no
          // "use another device".
          allowCredentials: [
            {
              type: "public-key",
              id: fromBase64url(credentialId),
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 60_000,
        },
      });
      try {
        sessionStorage.setItem("thb-unlocked", "1");
      } catch {
        /* private window */
      }
      setLocked(false);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setError("That didn't work. Try again.");
      }
    }
  }, [credentialId]);

  React.useEffect(() => {
    let id: string | null = null;
    let unlocked = false;
    try {
      id = localStorage.getItem(LOCAL_KEY);
      unlocked = sessionStorage.getItem("thb-unlocked") === "1";
    } catch {
      /* private window */
    }
    const installed = window.matchMedia("(display-mode: standalone)").matches;
    if (!id || !installed || !window.PublicKeyCredential) return;

    // Deferred so these are not a synchronous setState in the effect body.
    const credential = id;
    const shouldLock = !unlocked;
    const timer = window.setTimeout(() => {
      setCredentialId(credential);
      if (shouldLock) setLocked(true);
    }, 0);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
      } else if (
        hiddenAt.current &&
        Date.now() - hiddenAt.current > RELOCK_AFTER_MS
      ) {
        try {
          sessionStorage.removeItem("thb-unlocked");
        } catch {
          /* private window */
        }
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Escape hatch if the sensor will not read: turn the lock off on this device
  // (re-addable in Settings) and continue in the already-signed-in app.
  function useWithout() {
    try {
      localStorage.removeItem(LOCAL_KEY);
      sessionStorage.setItem("thb-unlocked", "1");
    } catch {
      /* private window */
    }
    setLocked(false);
  }

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
      className="admin-canvas fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <Logo variant="stacked" href={null} settings={null} />
      <div className="flex flex-col gap-1">
        <h1 className="text-h3">Locked</h1>
        <p className="text-sm text-foreground-muted">
          Unlock with your fingerprint.
        </p>
      </div>
      <Button type="button" onClick={unlock}>
        <Fingerprint aria-hidden="true" />
        Unlock
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={useWithout}
        className="rounded-sm text-xs text-foreground-subtle underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Can&apos;t scan? Open without it
      </button>
    </div>
  );
}
