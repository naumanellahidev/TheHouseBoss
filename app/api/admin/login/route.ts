import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { signInWithUsername } from "@/lib/auth/username-login";

/**
 * Username sign-in.
 *
 * A route handler rather than a Server Action, and that is a decision taken
 * from measurement rather than preference.
 *
 * The Server Action version authenticated correctly every time — the audit log
 * recorded `outcome: success` — but neither its return value nor the auth
 * cookies reached the browser: the cookie jar stayed empty and the form sat
 * there. A route handler sidesteps the whole question. It returns a real HTTP
 * 303 with real `Set-Cookie` headers, which is the oldest and most reliable way
 * to establish a session.
 *
 * It is also better on its own merits:
 *
 *   - The form is a plain `<form method="post">`. It works with JavaScript
 *     disabled and before hydration — an administrator can always sign in.
 *   - Errors come back as a query parameter, so there is no client state to
 *     desynchronise and the failure survives a refresh.
 *   - 303 (not 302) forces the follow-up to be a GET, so a browser back button
 *     cannot re-submit the password.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  // Shape only. A malformed username fails with the same generic message as a
  // wrong password, so this rule cannot be used to probe what is well-formed.
  username: z.string().trim().min(2).max(64),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

/** Only a path on this origin, and only under /admin. */
function safeDestination(next: string | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin")) return "/admin";
  // `//evil.example` is a protocol-relative URL, not a path.
  if (next.startsWith("//")) return "/admin";
  return next;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const parsed = schema.safeParse({
    username: form.get("username"),
    password: form.get("password"),
    next: form.get("next") ?? undefined,
  });

  const backToLogin = (nextPath?: string) => {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "credentials");
    if (nextPath) url.searchParams.set("next", nextPath);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!parsed.success) return backToLogin();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const result = await signInWithUsername(
    parsed.data.username,
    parsed.data.password,
    ip,
  );

  if (!result.ok) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set(
      "error",
      result.retryAfter ? "throttled" : "credentials",
    );
    if (parsed.data.next) url.searchParams.set("next", parsed.data.next);
    return NextResponse.redirect(url, { status: 303 });
  }

  /*
    `signInWithUsername` wrote the session through `cookies()`, which attaches
    the Set-Cookie headers to THIS response. Returning a redirect from here
    carries them, which is precisely what the Server Action route did not do.
  */
  return NextResponse.redirect(
    new URL(safeDestination(parsed.data.next), request.url),
    { status: 303 },
  );
}
