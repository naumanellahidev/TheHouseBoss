import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Turn a verified passkey into a Supabase session.
 *
 * Supabase Auth has no native WebAuthn, so a verified assertion cannot itself
 * mint a session. The bridge is the one server-to-server primitive Supabase
 * does give us: the service role generates a magic-link token for the user
 * (`generateLink` — it creates the token, it does NOT email anything), and the
 * cookie-bound server client immediately redeems that token with `verifyOtp`.
 * The redemption is what writes the `sb-*` auth cookies onto the response, so
 * the browser is signed in exactly as if a password had been typed.
 *
 * The token never leaves the server and is spent in the same request, so there
 * is no window in which it could be replayed. If any step fails the caller
 * stays signed out and falls back to the password form — a passkey problem can
 * never lock the one administrator out.
 */
export async function startSessionForUser(userId: string): Promise<boolean> {
  const service = createServiceClient();

  const { data: userData, error: userError } =
    await service.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userError || !email) return false;

  const { data: link, error: linkError } =
    await service.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return false;

  const server = await createSupabaseServerClient();
  const { error: verifyError } = await server.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  return !verifyError;
}
