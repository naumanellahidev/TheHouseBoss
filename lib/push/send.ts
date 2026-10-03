import "server-only";

import webpush from "web-push";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Sending a push notification to the admin's devices.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 *
 * The bell tells her what is waiting while the dashboard is open. This is for
 * when it is not: an enquiry at nine in the evening should reach a phone on a
 * table, not wait until the next time she opens the app.
 *
 * It sits beside the Resend email rather than replacing it. Email is the record
 * and survives a lost phone; the push is the one that arrives in seconds.
 *
 * ── Why a failure here is never an error the visitor sees ─────────────────
 *
 * Every caller is a public form submission. The enquiry is already saved by the
 * time this runs, and the visitor's reply must not depend on a push service
 * being reachable — so everything below logs and returns.
 *
 * ── Dead subscriptions are deleted, not retried ───────────────────────────
 *
 * A push service answers 404 or 410 when a subscription no longer exists: the
 * browser was cleared, the app was uninstalled, the device was wiped. Keeping
 * the row means sending to it forever and, worse, counting it in the UI as a
 * device that is receiving notifications. It is removed on the spot.
 */

type PushPayload = {
  title: string;
  body: string;
  /** Where tapping it should land. Must be a path on this site. */
  url: string;
  /** Collapses repeats on the lock screen: one per kind. */
  tag?: string;
  /** `urgent` keeps the notification on screen until it is acted on. */
  priority?: "urgent" | "normal";
};

let configured: boolean | null = null;

/**
 * Configure VAPID once, lazily.
 *
 * At module scope this would throw at import time on any deployment that has
 * not set the keys yet — including a preview build — and take the whole route
 * with it. Lazily, a missing key costs the notification and nothing else.
 */
function ready(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    configured = false;
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error("[push] VAPID details rejected:", error);
    configured = false;
  }

  return configured;
}

/** True when push is set up. The settings panel uses it to explain itself. */
export function isPushConfigured(): boolean {
  return ready();
}

/**
 * Send to every device the admins have registered.
 *
 * Every admin, not one — there is one admin today and the permission model
 * allows more, and an enquiry is not addressed to a particular person.
 */
export async function sendAdminPush(payload: PushPayload): Promise<void> {
  if (!ready()) return;

  const db = createServiceClient();

  const { data, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .limit(50);

  if (error) {
    console.error(`[push] could not read subscriptions: ${error.message}`);
    return;
  }

  const subscriptions = data ?? [];
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          {
            /*
              Ten seconds. A push service that has not accepted the message by
              then is one the caller should stop waiting for — this runs inside
              a request that has already saved the enquiry.
            */
            TTL: 60 * 60,
            urgency: payload.priority === "urgent" ? "high" : "normal",
          },
        );
      } catch (pushError: unknown) {
        const status =
          typeof pushError === "object" && pushError !== null && "statusCode" in pushError
            ? Number((pushError as { statusCode: unknown }).statusCode)
            : 0;

        // 404 / 410: the subscription is gone for good.
        if (status === 404 || status === 410) {
          dead.push(row.id);
          return;
        }

        console.error(`[push] send failed (${status || "unknown"}):`, pushError);
      }
    }),
  );

  if (dead.length > 0) {
    const { error: cleanupError } = await db
      .from("push_subscriptions")
      .delete()
      .in("id", dead);

    if (cleanupError) {
      console.error(`[push] could not remove dead subscriptions: ${cleanupError.message}`);
    }
  }

  /*
    The timestamp is best-effort and deliberately not awaited for correctness.

    It exists so the settings screen can say "last used" rather than showing a
    device with no history, and a failure to write it must not look like a
    failure to notify.
  */
  const alive = subscriptions.filter((row) => !dead.includes(row.id)).map((row) => row.id);
  if (alive.length > 0) {
    await db
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", alive)
      .then(({ error: touchError }) => {
        if (touchError) console.error(`[push] could not touch: ${touchError.message}`);
      });
  }
}
