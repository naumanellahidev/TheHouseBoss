"use client";

import * as React from "react";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

import { Button } from "@/components/ui/button";

/**
 * Fingerprint sign-in — add this device, see and remove the others.
 *
 * Adding a passkey is a one-tap gesture on the device: the browser asks the
 * operating system to create a credential bound to this site, the private key
 * stays in the phone's secure hardware, and only the public half is sent to the
 * server. The id of the key just added is kept in `localStorage` so the sign-in
 * screen and the app lock can go straight to this device's sensor without an
 * account picker.
 *
 * It degrades honestly: a browser with no platform authenticator shows why
 * instead of a button that would fail, and a failure here never touches the
 * password sign-in, which is always available.
 */

type Passkey = {
  id: string;
  device: string | null;
  created_at: string;
  last_used_at: string | null;
};

const LOCAL_KEY = "thb-passkey";

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua)
    ? "Android phone"
    : /iPhone/i.test(ua)
      ? "iPhone"
      : /iPad/i.test(ua)
        ? "iPad"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Mac/i.test(ua)
            ? "Mac"
            : "Device";
  const installed =
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return installed ? `${os} (app)` : os;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < day) return "today";
  const days = Math.round(diff / day);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FingerprintPanel() {
  const [passkeys, setPasskeys] = React.useState<Passkey[] | null>(null);
  const [supported, setSupported] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [localId, setLocalId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/passkey/list");
      const data = await res.json();
      setPasskeys(data.passkeys ?? []);
    } catch {
      setPasskeys([]);
    }
  }, []);

  React.useEffect(() => {
    // Deferred so the browser-only reads are not a synchronous setState in the
    // effect body (the lint rule, and SSR safety).
    const timer = window.setTimeout(() => {
      setSupported(!!window.PublicKeyCredential);
      try {
        setLocalId(localStorage.getItem(LOCAL_KEY));
      } catch {
        /* private window */
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function add() {
    setBusy("add");
    setError(null);
    try {
      const optionsJSON = await (
        await fetch("/api/auth/passkey/register-options", { method: "POST" })
      ).json();
      if (optionsJSON.error) throw new Error(optionsJSON.error);
      const response = await startRegistration({ optionsJSON });
      const res = await fetch("/api/auth/passkey/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, device: deviceLabel() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add the fingerprint.");
      try {
        localStorage.setItem(LOCAL_KEY, data.id);
      } catch {
        /* private window */
      }
      setLocalId(data.id);
      await load();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setError(
          err instanceof Error ? err.message : "Could not add the fingerprint.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await fetch("/api/auth/passkey/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (id === localId) {
        try {
          localStorage.removeItem(LOCAL_KEY);
        } catch {
          /* private window */
        }
        setLocalId(null);
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-h4 font-semibold">Fingerprint sign-in</h3>
        <p className="max-w-[70ch] text-sm text-foreground-muted">
          Add this phone or laptop once, then sign in with your fingerprint or
          face instead of typing a password. The installed app also unlocks with
          it. Your password always keeps working.
        </p>
      </div>

      {passkeys === null ? (
        <div className="flex h-11 items-center gap-2 text-sm text-foreground-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      ) : passkeys.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {passkeys.map((key) => (
            <li
              key={key.id}
              className="flex items-center gap-3 rounded-md bg-surface-sunken px-4 py-3"
            >
              <Fingerprint
                className="size-5 shrink-0 text-accent-quiet"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {key.device ?? "Device"}
                  {key.id === localId ? " · this device" : ""}
                </span>
                <span className="text-xs text-foreground-subtle">
                  {key.last_used_at
                    ? `Last used ${relativeTime(key.last_used_at)}`
                    : `Added ${relativeTime(key.created_at)}`}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${key.device ?? "fingerprint"}`}
                loading={busy === key.id}
                onClick={() => remove(key.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {supported ? (
        <div>
          <Button
            type="button"
            variant="outline"
            loading={busy === "add"}
            onClick={add}
          >
            <Fingerprint aria-hidden="true" />
            {localId ? "Add this device again" : "Add fingerprint on this device"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">
          This browser can&apos;t use fingerprints. Try Chrome on your phone or
          install the app.
        </p>
      )}
    </section>
  );
}
