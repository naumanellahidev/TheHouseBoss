import "server-only";

import { cookies, headers } from "next/headers";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { createServiceClient } from "@/lib/supabase/service";
import { siteConfig } from "@/lib/site-config";

/**
 * WebAuthn passkeys on top of Supabase Auth — the server half.
 *
 * Two things live here and nothing else: turning a fingerprint on this device
 * into a stored credential, and turning a fresh assertion back into proof that
 * the same finger signed it. Everything that touches the `admin_passkeys` and
 * `auth_challenges` tables goes through the service-role client, because
 * sign-in happens before there is a session to authorise the read.
 *
 * What this is NOT: it does not mint the Supabase session. A verified assertion
 * only tells the caller which user it was; `lib/auth/passkey-session.ts` turns
 * that into a signed-in cookie, kept separate so the crypto here has no
 * dependency on the auth provider.
 */

const PROD = process.env.NODE_ENV === "production";
export const CHALLENGE_COOKIE = PROD ? "__Host-thb_wa" : "thb_wa";
const RP_NAME = "House Boss";

type Transport = AuthenticatorTransportFuture;

/**
 * The relying party: the exact origin the browser is on, and the registrable
 * domain a passkey is scoped to. `rpID` drops a leading `www.` so a credential
 * registered on `www.` still verifies on the apex and vice-versa; the origin is
 * checked exactly and must be the real one the assertion was produced against.
 */
export async function relyingParty() {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (PROD ? "https" : "http");
  const origin =
    PROD && forwardedHost
      ? `https://${forwardedHost}`
      : forwardedHost
        ? `${proto}://${forwardedHost}`
        : siteConfig.url;
  const hostname = new URL(origin).hostname;
  const rpID = hostname.replace(/^www\./, "");
  return { origin, rpID, rpName: RP_NAME };
}

// ── Challenges (one-time, five minutes, behind an httpOnly cookie) ───────────

async function saveChallenge(challenge: string, userId: string | null) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("auth_challenges")
    .insert({ challenge, user_id: userId })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not start the fingerprint step.");
  // Opportunistic sweep so expired challenges never accumulate.
  if (Math.random() < 0.1) {
    await db
      .from("auth_challenges")
      .delete()
      .lt("expires_at", new Date().toISOString());
  }
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, data.id, {
    httpOnly: true,
    secure: PROD,
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
}

async function takeChallenge(userId: string | null): Promise<string> {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  const fail = () => new Error("That took too long. Please try again.");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw fail();
  const db = createServiceClient();
  // Delete-and-return: the challenge is spent whether or not verification then
  // succeeds, so a captured one cannot be tried twice.
  const { data } = await db
    .from("auth_challenges")
    .delete()
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .select("challenge, user_id")
    .maybeSingle();
  if (!data || (data.user_id ?? null) !== userId) throw fail();
  return data.challenge;
}

// ── Registration (signed in: add this device) ────────────────────────────────

export async function registrationOptions(user: {
  id: string;
  username: string | null;
  email: string | null;
}) {
  const rp = await relyingParty();
  const db = createServiceClient();
  const { data: existing } = await db
    .from("admin_passkeys")
    .select("id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userName: user.username ?? user.email ?? "admin",
    userDisplayName: user.username ?? user.email ?? "Admin",
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((p) => ({
      id: p.id,
      transports: (p.transports ?? []) as Transport[],
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
  await saveChallenge(options.challenge, user.id);
  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  device: string | null,
) {
  const rp = await relyingParty();
  const expectedChallenge = await takeChallenge(userId);
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  }).catch(() => null);

  if (!verification?.verified || !verification.registrationInfo) {
    throw new Error("The fingerprint could not be added. Please try again.");
  }
  const c = verification.registrationInfo.credential;
  const db = createServiceClient();
  const { error } = await db.from("admin_passkeys").insert({
    id: c.id,
    user_id: userId,
    public_key: Buffer.from(c.publicKey).toString("base64url"),
    counter: c.counter,
    transports: (c.transports ?? []) as string[],
    device,
  });
  if (error) throw new Error("Could not save the fingerprint. Please try again.");
  return c.id;
}

// ── Authentication (signed out: prove the finger) ────────────────────────────

/** `credentialId`, when the device knows which passkey it has, sends the user
 *  straight to that sensor with no account picker. */
export async function authenticationOptions(credentialId?: string) {
  const rp = await relyingParty();
  let allowCredentials: { id: string; transports?: Transport[] }[] | undefined;
  if (credentialId) {
    const db = createServiceClient();
    const { data } = await db
      .from("admin_passkeys")
      .select("id, transports")
      .eq("id", credentialId)
      .maybeSingle();
    if (data) {
      allowCredentials = [
        { id: data.id, transports: (data.transports ?? []) as Transport[] },
      ];
    }
  }
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "required",
    allowCredentials,
  });
  await saveChallenge(options.challenge, null);
  return options;
}

/** Verifies the assertion and returns the user id it belongs to, or throws. */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
): Promise<string> {
  const rp = await relyingParty();
  const expectedChallenge = await takeChallenge(null);
  const db = createServiceClient();
  const { data: passkey } = await db
    .from("admin_passkeys")
    .select("id, user_id, public_key, counter, transports")
    .eq("id", response.id)
    .maybeSingle();
  if (!passkey) {
    throw new Error(
      "This fingerprint is not set up for sign-in. Sign in with your password, then add it under Settings.",
    );
  }
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.id,
      publicKey: new Uint8Array(Buffer.from(passkey.public_key, "base64url")),
      counter: Number(passkey.counter),
      transports: (passkey.transports ?? []) as Transport[],
    },
  }).catch(() => null);

  if (!verification?.verified) {
    throw new Error("Fingerprint sign-in failed. Please try again.");
  }
  await db
    .from("admin_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", passkey.id);
  return passkey.user_id;
}

// ── Listing and removal (signed in) ──────────────────────────────────────────

export async function listPasskeys(userId: string) {
  const db = createServiceClient();
  const { data } = await db
    .from("admin_passkeys")
    .select("id, device, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function removePasskey(userId: string, id: string) {
  const db = createServiceClient();
  await db.from("admin_passkeys").delete().eq("user_id", userId).eq("id", id);
}
