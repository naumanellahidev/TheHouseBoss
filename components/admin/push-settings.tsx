"use client";

import * as React from "react";
import { BellRing, Send, Smartphone } from "lucide-react";

import {
  registerPushDevice,
  removePushDevice,
  sendTestPush,
} from "@/app/(admin)/admin/(shell)/push-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Turning notifications on for THIS device.
 *
 * ── Why it is per device and not an account setting ───────────────────────
 *
 * A push subscription belongs to a browser, not to a person. The phone, the
 * iPad and the laptop each have to agree separately, and a switch that looked
 * like an account preference would say "on" on a device that had never been
 * asked. So the control reports the state of the browser it is rendered in, and
 * says which that is.
 *
 * ── Why iOS gets its own sentence ─────────────────────────────────────────
 *
 * Safari delivers web push only to a web app that has been added to the home
 * screen, and only from iOS 16.4. In a Safari tab the permission prompt either
 * never appears or grants something that never fires. Offering a switch that
 * silently does nothing is worse than explaining the one extra step, so the
 * component detects the case and gives the instruction instead of the switch.
 */

type State = "checking" | "unsupported" | "needs-install" | "off" | "on" | "blocked";

/** The VAPID public key, base64url, as the subscribe call wants it. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);

  /*
    Backed by a plain ArrayBuffer, explicitly.

    `new Uint8Array(length)` is typed over ArrayBufferLike, which includes
    SharedArrayBuffer — and `applicationServerKey` will not accept that. Giving
    it a buffer of its own is both what the API wants and what it was always
    going to be at runtime.
  */
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** The two keys a subscription carries, as base64url strings. */
function keysOf(subscription: PushSubscription): { p256dh: string; auth: string } | null {
  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!p256dh || !auth) return null;

  const encode = (buffer: ArrayBuffer) =>
    window
      .btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return { p256dh: encode(p256dh), auth: encode(auth) };
}

export function PushSettings({ publicKey }: { publicKey: string | null }) {
  const toast = useToast();
  const [state, setState] = React.useState<State>("checking");
  const [busy, setBusy] = React.useState<"toggle" | "test" | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const decide = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        /*
          On an iPhone this is the Safari-tab case, not an old browser: the
          APIs exist only inside an installed app. `standalone` is the flag
          that tells the two apart, and it is the difference between "your
          browser cannot do this" and "add it to your home screen first".
        */
        const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        const standalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as { standalone?: boolean }).standalone === true;

        if (!cancelled) setState(iOS && !standalone ? "needs-install" : "unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }

      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const existing = await registration?.pushManager.getSubscription().catch(() => null);
      if (!cancelled) setState(existing ? "on" : "off");
    };

    void decide();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    if (!publicKey) {
      toast.error("Push is not configured on the server yet.");
      return;
    }

    setBusy("toggle");
    try {
      /*
        The permission prompt must come from the press.

        Browsers refuse `Notification.requestPermission()` outside a user
        gesture, and Safari is the strictest about it — asking during the effect
        above would be silently denied and the switch would appear broken.
      */
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        toast.error("Notifications were not allowed for this device.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Required and must be true: a push that does not show a notification
        // is not permitted for a web app, and Chrome refuses the subscription.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const keys = keysOf(subscription);
      if (!keys) {
        toast.error("This browser did not return the keys we need.");
        return;
      }

      const result = await registerPushDevice({
        endpoint: subscription.endpoint,
        ...keys,
        userAgent: navigator.userAgent,
      });

      if (!result.ok) {
        // Leave nothing behind: a subscription the server does not know about
        // is a device that thinks it is enabled and will never be sent to.
        await subscription.unsubscribe().catch(() => undefined);
        toast.error(result.error);
        return;
      }

      setState("on");
      toast.success(result.message);
    } catch (error) {
      console.error("[push] subscribe failed:", error);
      toast.error("This device could not be registered for notifications.");
    } finally {
      setBusy(null);
    }
  }

  async function turnOff() {
    setBusy("toggle");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await removePushDevice(subscription.endpoint);
        await subscription.unsubscribe().catch(() => undefined);
      }

      setState("off");
      toast.success("This device will no longer get notifications.");
    } catch (error) {
      console.error("[push] unsubscribe failed:", error);
      toast.error("This device could not be removed.");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    const result = await sendTestPush();
    setBusy(null);
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
  }

  return (
    <section
      aria-labelledby="push-heading"
      className="flex flex-col gap-4 admin-card p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-wash">
          <BellRing className="size-5 text-accent-quiet" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 id="push-heading" className="text-h4">
            Notifications on this device
          </h3>
          <p className="max-w-[62ch] text-sm text-foreground-muted">
            A new enquiry or a review waiting for approval reaches this device
            even when the dashboard is closed. Each device is asked separately —
            turning it on here does not turn it on for your other ones.
          </p>
        </div>
      </div>

      {state === "checking" ? (
        <p className="text-sm text-foreground-subtle">Checking this device…</p>
      ) : null}

      {state === "needs-install" ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-sunken p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Smartphone className="size-4" aria-hidden="true" />
            Add the app to your home screen first
          </p>
          <p className="text-sm text-foreground-muted">
            On iPhone and iPad, notifications only work from the installed app.
            Tap the <span className="font-medium text-foreground">Share</span>{" "}
            button, then{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>
            . Open the dashboard from that icon and this switch will be here.
          </p>
        </div>
      ) : null}

      {state === "unsupported" ? (
        <p className="rounded-2xl bg-surface-sunken p-4 text-sm text-foreground-muted">
          This browser does not support notifications. The emails still arrive,
          and the bell in the bar shows everything waiting whenever the dashboard
          is open.
        </p>
      ) : null}

      {state === "blocked" ? (
        <p className="rounded-2xl bg-warning-bg p-4 text-sm text-foreground">
          Notifications are blocked for this site in your browser settings. Allow
          them there and come back — the browser will not ask again on its own.
        </p>
      ) : null}

      {state === "on" || state === "off" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={state === "on" ? "outline" : "accent"}
            className="rounded-full"
            loading={busy === "toggle"}
            onClick={() => void (state === "on" ? turnOff() : turnOn())}
          >
            {state === "on" ? "Turn off on this device" : "Turn on for this device"}
          </Button>

          {state === "on" ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              loading={busy === "test"}
              onClick={() => void test()}
            >
              <Send aria-hidden="true" />
              Send a test
            </Button>
          ) : null}

          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
              state === "on" ? "bg-success-bg text-success" : "bg-surface-sunken text-foreground-muted",
            )}
          >
            {state === "on" ? "On" : "Off"}
          </span>
        </div>
      ) : null}

      {!publicKey ? (
        <p className="text-xs text-foreground-subtle">
          The server has no push keys configured, so the switch will not work
          until they are set.
        </p>
      ) : null}
    </section>
  );
}
