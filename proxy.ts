import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Formerly `middleware.ts`. Next.js 16 deprecates that file convention in
 * favour of `proxy.ts`; behaviour, matcher and execution point are unchanged.
 *
 * This proxy does three things and no more:
 *
 *   1. guards /admin (layer 1 of 3 — the server layout checks the role, RLS
 *      backs both up)
 *   2. refreshes the Supabase session cookie, but only where a session exists
 *   3. marks every non-production deployment noindex, so a preview build can
 *      never be crawled
 *
 * What it deliberately does NOT do: resolve the `redirects` table. That would
 * add a database round trip to every single request. A slug redirect is a
 * miss-path concern, so it is handled in the route's not-found branch instead —
 * zero cost on the 99.9% of requests that resolve normally.
 *
 * ── Why the Supabase call is scoped to /admin ─────────────────────────────
 *
 * The first Vercel deployment returned 500 on every page while `sitemap.xml`,
 * `llms.txt` and `robots.txt` — the routes this matcher excludes — returned 200.
 * That isolated the fault to this file: `supabase.auth.getUser()` ran on EVERY
 * request, and an unhandled throw from it took the whole site down.
 *
 * Public pages have no session and no reason to ask about one. Scoping the call
 * to /admin removes a network round trip from every public request, which is
 * both the fix and a real performance gain on the pages that matter most.
 */

/**
 * Guarded rather than `!`-asserted. A missing variable here used to surface as
 * `supabaseKey is required` thrown from inside `createServerClient` on every
 * request — a site-wide 500 whose message named nothing useful.
 */
function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && key ? { url, key } : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  /** Preview deployments must never be crawled, whatever else happens below. */
  const finish = (result: NextResponse) => {
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      result.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return result;
  };

  // Public pages: no auth work at all.
  if (!pathname.startsWith("/admin")) return finish(response);

  /*
    /admin/login and /admin/auth/* are the way IN, and this proxy does not touch
    them at all.

    Guarding them would make the magic-link callback unreachable and produce a
    redirect loop — but the stronger reason is cookies. Creating a Supabase
    client here calls `getUser()`, which can write session cookies onto THIS
    response. On the login POST that raced the Server Action's own cookies and
    the sign-in silently failed to persist: the server logged `outcome: success`
    and the browser ended up with an empty cookie jar. Measured, not guessed.

    Nothing is lost by skipping them. These routes have no session to guard, and
    bouncing an already-signed-in visitor away from the login screen is done by
    the page itself, which can read the session safely.
  */
  const isAuthRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/auth");

  if (isAuthRoute) return finish(response);

  const toLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return finish(NextResponse.redirect(url));
  };

  const config = credentials();
  if (!config) {
    console.error(
      "[proxy] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
    );
    // Fail CLOSED on the dashboard: without credentials we cannot establish who
    // is asking, and the answer to that is never "let them in".
    return toLogin();
  }

  let user = null;

  try {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Refreshes the token if it has expired. Must run before any auth check.
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (error) {
    // Reaching Supabase is a network call and network calls fail. Log it and
    // fall through: `user` stays null, so the guard below sends an unverified
    // visitor to the login screen rather than 500-ing, and the server layout
    // plus RLS still stand behind it.
    console.error("[proxy] session lookup failed:", error);
  }

  if (!user) return toLogin();

  return finish(response);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Keeping the matcher
     * tight matters: this runs on every matched request.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|placeholder-property.svg|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
