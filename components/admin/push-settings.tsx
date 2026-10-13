"use client";

import * as React from "react";
import { BellRing, Send, Smartphone } from "lucide-react";

import { sendTestPush } from "@/app/(admin)/admin/(shell)/push-actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  detectPushState,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type PushState,
} from "@/lib/push/device";
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

export function PushSettings({ publicKey }: { publicKey: string | null }) {
  const toast = useToast();
  const [state, setState] = React.useState<PushState>("checking");
  const [busy, setBusy] = React.useState<"toggle" | "test" | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void detectPushState().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The subscribe flow lives in lib/push/device.ts, shared with the first-run
  // popup in the installed app. It must still be started by this press.
  async function turnOn() {
    setBusy("toggle");
    const result = await subscribeThisDevice(publicKey);
    setBusy(null);
    if (result.ok) {
      setState("on");
      toast.success(result.message);
    } else {
      if (result.state) setState(result.state);
      toast.error(result.error);
    }
  }

  async function turnOff() {
    setBusy("toggle");
    const result = await unsubscribeThisDevice();
    setBusy(null);
    if (result.ok) {
      setState("off");
      toast.success(result.message);
    } else {
      toast.error(result.error);
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
