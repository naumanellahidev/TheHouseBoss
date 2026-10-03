"use server";

import { getAdminIdentity } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/auth/audit";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Registering and removing a device for push notifications.
 *
 * ── Why the service client and not the user's own ─────────────────────────
 *
 * The policy on `push_subscriptions` is `is_admin() and user_id = auth.uid()`,
 * so the signed-in client could do this itself. It goes through the service
 * client because `user_id` is then set from the verified identity on the server
 * rather than from anything the caller sent — the one field that decides whose
 * phone gets notified is never taken from the request body.
 *
 * ── Why a subscription is an upsert on the endpoint ───────────────────────
 *
 * A browser that re-subscribes returns the SAME endpoint. Inserting would fail
 * on the unique constraint and look like an error to somebody who simply opened
 * the dashboard on a device they had already enabled; upserting makes pressing
 * the switch twice harmless, which is what a person expects a switch to be.
 */

export type PushResult = { ok: true; message: string } | { ok: false; error: string };

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

export async function registerPushDevice(
  input: PushSubscriptionInput,
): Promise<PushResult> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Your session has expired. Sign in again." };

  /*
    Shape-check what the browser handed back.

    These three strings go into a signed request to a push service. A truncated
    key produces a send that fails for every future notification with an error
    nobody is watching for, so the row is refused now rather than written and
    discovered later.
  */
  const endpoint = input?.endpoint?.trim();
  const p256dh = input?.p256dh?.trim();
  const auth = input?.auth?.trim();

  if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 2000) {
    return { ok: false, error: "That browser returned an endpoint we cannot use." };
  }
  if (!p256dh || !auth || p256dh.length > 256 || auth.length > 256) {
    return { ok: false, error: "That browser returned keys we cannot use." };
  }

  const db = createServiceClient();
  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: identity.id,
      endpoint,
      p256dh,
      auth,
      // Trimmed: it is shown in the device list, not parsed, and a full UA
      // string is 200 characters of noise in a table cell.
      user_agent: input.userAgent?.slice(0, 200) ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error(`[push] could not register device: ${error.message}`);
    return { ok: false, error: "The device could not be registered. Try again." };
  }

  await recordAudit({
    action: "push_device_registered",
    entityType: "push_subscriptions",
    entityId: endpoint.slice(-24),
    metadata: { userAgent: input.userAgent?.slice(0, 120) ?? null },
  });

  return { ok: true, message: "This device will now get notifications." };
}

export async function removePushDevice(endpoint: string): Promise<PushResult> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Your session has expired. Sign in again." };

  const db = createServiceClient();
  const { error } = await db
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    // Scoped to the caller even though the service client bypasses the policy:
    // an endpoint is guessable from a leaked log, and nobody should be able to
    // unsubscribe somebody else's phone.
    .eq("user_id", identity.id);

  if (error) {
    console.error(`[push] could not remove device: ${error.message}`);
    return { ok: false, error: "The device could not be removed. Try again." };
  }

  await recordAudit({
    action: "push_device_removed",
    entityType: "push_subscriptions",
    entityId: endpoint.slice(-24),
  });

  return { ok: true, message: "This device will no longer get notifications." };
}

/**
 * Send one notification to the caller's own devices.
 *
 * The switch is useless without it. Granting permission tells you the browser
 * agreed; it does not tell you the key is right, the service is reachable, or
 * that anything will actually appear on a lock screen — and on iOS, where this
 * only works for an installed app, that is exactly the thing somebody needs to
 * confirm before relying on it.
 */
export async function sendTestPush(): Promise<PushResult> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Your session has expired. Sign in again." };

  const { isPushConfigured, sendAdminPush } = await import("@/lib/push/send");
  if (!isPushConfigured()) {
    return {
      ok: false,
      error: "Push is not configured on the server — the VAPID keys are missing.",
    };
  }

  /*
    The brand name comes from settings, not from a literal.

    There is one source for it — Admin → Settings → Branding — and a second copy
    in a notification title is a second brand that goes stale the day she renames
    anything. The logo guard enforces exactly this.
  */
  const { getSiteSettings } = await import("@/lib/queries/settings");
  const settings = await getSiteSettings().catch(() => null);

  await sendAdminPush({
    title: settings?.brandName?.trim() || "Dashboard",
    body: "Notifications are working. This is what a new enquiry will look like.",
    url: "/admin",
    tag: "test",
  });

  return { ok: true, message: "Sent. It should appear within a few seconds." };
}
