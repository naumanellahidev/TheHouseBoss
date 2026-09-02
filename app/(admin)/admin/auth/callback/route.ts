import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Magic-link landing route.
 *
 * Supabase sends the user here with a `code` (PKCE) or a `token_hash` +
 * `type` (the older email-OTP link shape). Both are handled: which one arrives
 * depends on the project's email template, and a login that only works with one
 * of them fails silently and confusingly.
 *
 * The session cookie is written by the server client's `setAll`, which is why
 * this is a route handler and not a page — a Server Component cannot set
 * cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // Only ever redirect to a path on this origin — an open redirect here would
  // hand an attacker a link that looks like a legitimate admin login.
  const requested = searchParams.get("next") ?? "/admin";
  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/admin";

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return failed(origin, error.message);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "recovery" | "invite",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return failed(origin, error.message);
  }

  return failed(origin, "That link is missing its sign-in token.");
}

/**
 * The reason is passed back as a short code, not as the raw Supabase message:
 * the login screen turns it into a sentence a person can act on, and an auth
 * error string in a URL is a small information leak.
 */
function failed(origin: string, reason: string) {
  console.warn(`[auth] magic-link callback failed: ${reason}`);
  const url = new URL("/admin/login", origin);
  url.searchParams.set("error", "link");
  return NextResponse.redirect(url);
}
