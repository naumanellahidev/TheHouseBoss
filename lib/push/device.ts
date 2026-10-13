import {
  registerPushDevice,
  removePushDevice,
} from "@/app/(admin)/admin/(shell)/push-actions";

/**
 * Push on THIS device — the browser half of web push.
 *
 * Shared by the Settings → Notifications switch and the first-run popup inside
 * the installed app, so there is one subscribe flow and not two that drift. The
 * server half (`send.ts`) is server-only; this file runs only in the browser and
 * every function in it assumes `window`.
 */

export type PushState =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "off"
  | "on"
  | "blocked";

export type PushResult = { ok: true; message: string } | { ok: false; error: string; state?: PushState };

/** True when the page is running as the installed app rather than in a tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/*
  iPadOS 13+ reports itself as a Mac, so the touch check is what catches an
  iPad — without it an iPad would be offered Chrome's install flow, which does
  not exist there.
*/
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

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

/** Where this browser stands, without asking the user anything. */
export async function detectPushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    /*
      On an iPhone this is the Safari-tab case, not an old browser: the APIs
      exist only inside an installed app. `standalone` is the flag that tells
      the two apart, and it is the difference between "your browser cannot do
      this" and "add it to your home screen first".
    */
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }

  if (Notification.permission === "denied") return "blocked";

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const existing = await registration?.pushManager.getSubscription().catch(() => null);
  return existing ? "on" : "off";
}

/**
 * Ask for permission, subscribe, and register the device with the server.
 *
 * Must be called from a click. Browsers refuse `Notification.requestPermission()`
 * outside a user gesture, and Safari is the strictest about it — asking from an
 * effect would be silently denied and the control would appear broken.
 */
export async function subscribeThisDevice(publicKey: string | null): Promise<PushResult> {
  if (!publicKey) return { ok: false, error: "Push is not configured on the server yet." };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        error: "Notifications were not allowed for this device.",
        state: permission === "denied" ? "blocked" : "off",
      };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      // Required and must be true: a push that does not show a notification is
      // not permitted for a web app, and Chrome refuses the subscription.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const keys = keysOf(subscription);
    if (!keys) return { ok: false, error: "This browser did not return the keys we need." };

    const result = await registerPushDevice({
      endpoint: subscription.endpoint,
      ...keys,
      userAgent: navigator.userAgent,
    });

    if (!result.ok) {
      // Leave nothing behind: a subscription the server does not know about is
      // a device that thinks it is enabled and will never be sent to.
      await subscription.unsubscribe().catch(() => undefined);
      return { ok: false, error: result.error };
    }

    return { ok: true, message: result.message };
  } catch (error) {
    console.error("[push] subscribe failed:", error);
    return { ok: false, error: "This device could not be registered for notifications." };
  }
}

/** Remove this device from the server and drop the browser's subscription. */
export async function unsubscribeThisDevice(): Promise<PushResult> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await removePushDevice(subscription.endpoint);
      await subscription.unsubscribe().catch(() => undefined);
    }

    return { ok: true, message: "This device will no longer get notifications." };
  } catch (error) {
    console.error("[push] unsubscribe failed:", error);
    return { ok: false, error: "This device could not be removed." };
  }
}
