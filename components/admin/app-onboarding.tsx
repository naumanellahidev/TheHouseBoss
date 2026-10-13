"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellRing,
  Check,
  Download,
  Settings,
  Share,
  SquarePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  detectPushState,
  isIOS,
  isStandalone,
  subscribeThisDevice,
  type PushState,
} from "@/lib/push/device";

/**
 * Two popups that turn the dashboard into an app on a phone (client,
 * 2026-10-13):
 *
 *   <InstallPrompt />  in a browser tab — offers to install, automatically.
 *   <PushIntro />      inside the installed app, the first time — what
 *                      notifications need, and a button that turns them on.
 *
 * They never show together: one runs only in a tab, the other only standalone.
 *
 * ── Why a popup of our own and not Chrome's ───────────────────────────────
 *
 * Chrome shows its own install offer only as a small icon in the address bar,
 * or a mini-infobar it decides on by itself and often never shows. A page may
 * not open the real install dialog on load either: `prompt()` works only from
 * a tap. So the page keeps Chrome's `beforeinstallprompt` event, opens its own
 * popup the moment the dashboard loads, and the popup's Install button is the
 * tap that opens Chrome's dialog.
 *
 * iOS has no install API at all — Safari installs only through Share → Add to
 * Home Screen — so on an iPhone the same popup shows those steps instead.
 *
 * ── Why automated browsers never see them ─────────────────────────────────
 *
 * A modal on load would sit over every screen a test drives and swallow its
 * clicks. `navigator.webdriver` is set by Playwright and every other driver,
 * and by no real browser, so it is the honest test for "nobody is looking".
 */

const INSTALL_SNOOZE_KEY = "hb-install-snoozed-at";
const PUSH_INTRO_KEY = "hb-push-intro-seen";

/*
  "Not now" holds for three days, then she is asked again. Never again would
  lose the app the first time she was busy; every visit would be nagging.
*/
const INSTALL_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/** Chrome's install event. Not in the DOM lib types — it is Chromium-only. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/*
  Caught at module load, not in an effect.

  Chrome fires `beforeinstallprompt` once, as soon as the page qualifies, and
  that can be before React has hydrated this component. A listener added in
  useEffect would then miss it and the popup would never appear. This module is
  evaluated with the page's JavaScript, ahead of any effect, and keeps the event
  for whichever component mounts.
*/
let deferredInstall: InstallEvent | null = null;
const installListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stops Chrome's own mini-infobar; ours replaces it.
    event.preventDefault();
    deferredInstall = event as InstallEvent;
    installListeners.forEach((notify) => notify());
  });
  window.addEventListener("appinstalled", () => {
    deferredInstall = null;
    installListeners.forEach((notify) => notify());
  });
}

/** localStorage can throw (private mode, blocked storage) — never let it break a page. */
function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* nothing to do — the popup simply may show again */
  }
}

/*
  On open, focus goes to the main button rather than to the close (X) button,
  which Radix would pick as the first focusable element. Opening with the X
  ringed read as "close this", the opposite of what the popup is asking.
*/
function focusPrimary(event: Event) {
  event.preventDefault();
  (event.currentTarget as HTMLElement | null)
    ?.querySelector<HTMLElement>("[data-autofocus]")
    // Without preventScroll the body scrolls to the button and the list of
    // requirements opens already scrolled out of sight.
    ?.focus({ preventScroll: true });
}

function automated(): boolean {
  return navigator.webdriver === true;
}

/* ─────────────────────────────── Install ─────────────────────────────── */

export function InstallPrompt() {
  const toast = useToast();
  const [mode, setMode] = React.useState<"chrome" | "ios" | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (automated() || isStandalone()) return;

    const snoozedAt = Number(readStore(INSTALL_SNOOZE_KEY) ?? 0);
    if (Date.now() - snoozedAt < INSTALL_SNOOZE_MS) return;

    if (isIOS()) {
      // A beat after load, so the page is there to see behind it.
      const timer = window.setTimeout(() => {
        setMode("ios");
        setOpen(true);
      }, 900);
      return () => window.clearTimeout(timer);
    }

    const sync = () => {
      if (deferredInstall) {
        setMode("chrome");
        setOpen(true);
      } else {
        // Installed from elsewhere (the address-bar icon) while this was open.
        setOpen(false);
      }
    };
    if (deferredInstall) sync();
    installListeners.add(sync);
    return () => {
      installListeners.delete(sync);
    };
  }, []);

  function snooze() {
    writeStore(INSTALL_SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  }

  async function install() {
    const event = deferredInstall;
    if (!event) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      // The event is single-use either way.
      deferredInstall = null;
      if (outcome === "accepted") {
        setOpen(false);
        toast.success("Installed. Open The House Boss from your home screen.");
      } else {
        snooze();
      }
    } catch {
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : snooze())}>
      <DialogContent
        onOpenAutoFocus={focusPrimary}
        title="Install the dashboard as an app"
        description="One tap from your home screen, full screen, and it stays signed in."
      >
        <div className="flex flex-col gap-4 text-sm text-foreground-muted">
          {mode === "chrome" ? (
            <ul className="flex flex-col gap-2.5">
              {[
                "Opens straight to the dashboard — no browser, no address bar.",
                "New enquiries and reviews can reach your phone even when the app is closed.",
                "Takes no storage to speak of, and removes like any other app.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Tap <Strong>Share</Strong>{" "}
                <Share className="inline size-4 align-text-bottom text-accent-quiet" aria-label="(the share icon)" />{" "}
                in the browser bar. In Chrome on iPhone it is at the top right, beside the address.
              </Step>
              <Step n={2}>
                Scroll and tap <Strong>Add to Home Screen</Strong>{" "}
                <SquarePlus className="inline size-4 align-text-bottom text-accent-quiet" aria-hidden="true" />
                . If it is missing, tap <Strong>Edit Actions</Strong> at the bottom of that list to add it.
              </Step>
              <Step n={3}>
                Tap <Strong>Add</Strong>, then open the dashboard from the new icon. Notifications only
                work from that icon on iPhone and iPad.
              </Step>
            </ol>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" className="rounded-full" onClick={snooze}>
            Not now
          </Button>
          {mode === "chrome" ? (
            <Button
              type="button"
              variant="accent"
              className="rounded-full"
              data-autofocus
              loading={busy}
              onClick={() => void install()}
            >
              <Download aria-hidden="true" />
              Install app
            </Button>
          ) : (
            <Button type="button" variant="accent" className="rounded-full" data-autofocus onClick={snooze}>
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────── Push intro ─────────────────────────────── */

/**
 * The first time the installed app opens: what notifications need, then the
 * same subscribe flow as Settings → Notifications.
 *
 * Shown once per device. Whatever she chooses, the switch in Settings is where
 * it lives afterwards, and the popup says so.
 */
export function PushIntro({ publicKey }: { publicKey: string | null }) {
  const toast = useToast();
  const [state, setState] = React.useState<PushState>("checking");
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [ios, setIos] = React.useState(false);

  React.useEffect(() => {
    if (automated() || !isStandalone() || readStore(PUSH_INTRO_KEY)) return;

    let cancelled = false;
    void detectPushState().then((next) => {
      if (cancelled) return;
      setIos(isIOS());
      setState(next);
      // Already on: nothing to explain. Unsupported: nothing to offer.
      if (next === "off" || next === "blocked") setOpen(true);
      else writeStore(PUSH_INTRO_KEY, "1");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    writeStore(PUSH_INTRO_KEY, "1");
    setOpen(false);
  }

  async function turnOn() {
    setBusy(true);
    const result = await subscribeThisDevice(publicKey);
    setBusy(false);
    if (result.ok) {
      toast.success(result.message);
      close();
    } else {
      if (result.state) setState(result.state);
      toast.error(result.error);
    }
  }

  if (state === "checking") return null;

  const settingsPath = ios
    ? "Settings → Notifications → House Boss"
    : "Settings → Apps → House Boss → Notifications";

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        onOpenAutoFocus={focusPrimary}
        title="Get notified about new enquiries"
        description="A new enquiry or a review waiting for approval reaches this phone, even when the app is closed."
      >
        <div className="flex flex-col gap-4 text-sm text-foreground-muted">
          <p className="font-semibold text-foreground">What it needs</p>
          <ol className="flex flex-col gap-3">
            {ios ? (
              <Step n={1}>
                <Strong>iOS 16.4 or later</Strong>, and the app opened from its home-screen icon — as
                it is now. In Safari itself, iPhone never delivers them.
              </Step>
            ) : (
              <Step n={1}>
                <Strong>The installed app</Strong> — as it is now — with Chrome kept up to date, since Chrome is what delivers them on Android.
              </Step>
            )}
            <Step n={2}>
              Tap <Strong>Turn on</Strong> below, then <Strong>Allow</Strong> when the phone asks.
              It asks only once.
            </Step>
            <Step n={3}>
              Leave them allowed in <Strong>{settingsPath}</Strong>. Focus, Do Not Disturb and
              battery saver can hold them back.
            </Step>
            <Step n={4}>
              <Strong>Each device is separate.</Strong> Turning them on here does not turn them on for
              your laptop or tablet — do it once on each.
            </Step>
          </ol>

          {state === "blocked" ? (
            <p className="rounded-2xl bg-warning-bg p-4 text-foreground">
              Notifications are blocked for this app right now, and the phone will not ask again. Allow
              them in <Strong>{settingsPath}</Strong>, then turn them on in Settings → Notifications
              here.
            </p>
          ) : null}

          <p className="flex items-start gap-2 text-xs text-foreground-subtle">
            <Settings className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            You can turn them off, or send a test, any time in Settings → Notifications.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" className="rounded-full" onClick={close}>
            Not now
          </Button>
          {state === "blocked" ? (
            <Button asChild variant="accent" className="rounded-full" data-autofocus>
              <Link href="/admin/settings?tab=notifications" onClick={close}>
                Open Settings
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="accent"
              className="rounded-full"
              data-autofocus
              loading={busy}
              onClick={() => void turnOn()}
            >
              <BellRing aria-hidden="true" />
              Turn on notifications
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-semibold text-accent-quiet"
      >
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}
