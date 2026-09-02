import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware does three things and no more:
 *
 *   1. refreshes the Supabase session cookie
 *   2. guards /admin (layer 1 of 3 — the server layout checks the role, RLS
 *      backs both up)
 *   3. marks every non-production deployment noindex, so a preview build can
 *      never be crawled
 *
 * What it deliberately does NOT do: resolve the `redirects` table. That would
 * add a database round trip to every single request. A slug redirect is a
 * miss-path concern, so it is handled in the route's not-found branch instead —
 * zero cost on the 99.9% of requests that resolve normally.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  // Refreshes the token if it has expired. Must run before any auth check.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── admin guard ──────────────────────────────────────────────────────────
  // /admin/login and /admin/auth/* are the way IN. Guarding them would make the
  // magic-link callback unreachable and produce a redirect loop.
  const isAuthRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/auth");

  if (pathname.startsWith("/admin") && !isAuthRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in — no reason to sit on the login screen.
  if (pathname === "/admin/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ── never let a preview deployment be indexed ────────────────────────────
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Keeping the matcher
     * tight matters: middleware runs on every matched request, and a session
     * refresh is not free.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|placeholder-property.svg|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
