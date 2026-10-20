import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { recordAudit } from "@/lib/auth/audit";
import { startSessionForUser } from "@/lib/auth/passkey-session";
import {
  authenticationOptions,
  listPasskeys,
  registrationOptions,
  removePasskey,
  verifyAuthentication,
  verifyRegistration,
} from "@/lib/auth/passkeys";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Fingerprint sign-in and management (WebAuthn).
 *
 *   register-options · register   — signed in, add this device's fingerprint
 *   login-options    · login      — signed out, prove it and start a session
 *   list             · remove     — signed in, see and delete passkeys
 *
 * The sign-in paths are rate-limited per IP. Every path answers in JSON; the
 * login path, on success, has already had the session cookies written onto the
 * response by `startSessionForUser`, so the browser only has to navigate.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (action !== "list") return fail(404, "Not found.");
  const admin = await getAdminIdentity();
  if (!admin) return fail(401, "Sign in to manage passkeys.");
  return NextResponse.json({ passkeys: await listPasskeys(admin.id) });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;

  try {
    // ── Signed-in management ──
    if (action === "register-options") {
      const admin = await getAdminIdentity();
      if (!admin) return fail(401, "Sign in first.");
      return NextResponse.json(
        await registrationOptions({
          id: admin.id,
          username: admin.username,
          email: admin.email,
        }),
      );
    }

    if (action === "register") {
      const admin = await getAdminIdentity();
      if (!admin) return fail(401, "Sign in first.");
      const body = await request.json();
      const parsed = z
        .object({
          response: z.record(z.string(), z.unknown()),
          device: z.string().trim().max(120).optional(),
        })
        .safeParse(body);
      if (!parsed.success) return fail(400, "Invalid request.");
      const id = await verifyRegistration(
        admin.id,
        parsed.data.response as unknown as RegistrationResponseJSON,
        parsed.data.device ?? null,
      );
      await recordAudit({
        action: "passkey_added",
        entityType: "passkey",
        entityId: id.slice(-12),
        metadata: { device: parsed.data.device ?? null },
      });
      return NextResponse.json({ id }, { status: 201 });
    }

    if (action === "remove") {
      const admin = await getAdminIdentity();
      if (!admin) return fail(401, "Sign in first.");
      const body = await request.json();
      const parsed = z.object({ id: z.string().max(400) }).safeParse(body);
      if (!parsed.success) return fail(400, "Invalid request.");
      await removePasskey(admin.id, parsed.data.id);
      await recordAudit({
        action: "passkey_removed",
        entityType: "passkey",
        entityId: parsed.data.id.slice(-12),
      });
      return NextResponse.json({ ok: true });
    }

    // ── Signed-out sign-in ──
    const limit = rateLimit(
      `passkey:${clientIp(request.headers)}`,
      20,
      15 * 60 * 1000,
    );
    if (!limit.ok) return fail(429, "Too many attempts. Please try again later.");

    if (action === "login-options") {
      const body = await request.json().catch(() => ({}));
      const id =
        typeof body?.id === "string" && body.id.length <= 400
          ? body.id
          : undefined;
      return NextResponse.json(await authenticationOptions(id));
    }

    if (action === "login") {
      const body = await request.json();
      const parsed = z
        .object({ response: z.record(z.string(), z.unknown()) })
        .safeParse(body);
      if (!parsed.success) return fail(400, "Invalid request.");
      const userId = await verifyAuthentication(
        parsed.data.response as unknown as AuthenticationResponseJSON,
      );
      const started = await startSessionForUser(userId);
      if (!started) {
        return fail(
          500,
          "Signed the fingerprint but could not start the session. Use your password.",
        );
      }
      await recordAudit({
        action: "passkey_login",
        userId,
        entityType: "passkey",
      });
      return NextResponse.json({ ok: true });
    }

    return fail(404, "Not found.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    // Verification failures are the expected 4xx here, not server faults.
    return fail(400, message);
  }
}
