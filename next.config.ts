import type { NextConfig } from "next";

/**
 * Resolve the site's own public URL at build time.
 *
 * This value is baked into canonicals, the sitemap, `llms.txt`, every JSON-LD
 * `@id` and every absolute OG image URL, so it has to be correct at BUILD time,
 * not request time — which is why it is resolved here and re-exported through
 * `env` below rather than read from `process.env` at each call site.
 *
 * The order matters:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — an explicit setting always wins. This is what
 *      the real domain uses, and `docs/12` § 2 says to set it before the first
 *      production deploy.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's stable production
 *      domain, e.g. `the-house-boss.vercel.app`. Used only for production
 *      deployments, so a production build without a custom domain still emits
 *      correct, stable absolute URLs instead of a per-deploy hash.
 *   3. `VERCEL_URL` — the per-deployment hostname. Previews only, where a URL
 *      unique to the deployment is exactly what is wanted; middleware marks
 *      those `noindex`, so nothing here can be crawled.
 *   4. localhost, for `next dev` and `next start`.
 *
 * The effect is that the project deploys to a bare `*.vercel.app` with no
 * configuration at all, and switches to the real domain by setting one variable.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && production) {
    return `https://${production}`;
  }

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;

  return `http://localhost:${process.env.PORT || 3000}`;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Re-exported so it is inlined into both the server and the client bundle.
   * `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are not `NEXT_PUBLIC_`
   * variables and are therefore invisible to client components, several of
   * which read `siteConfig.url`.
   */
  env: {
    NEXT_PUBLIC_SITE_URL: resolveSiteUrl(),
  },

  images: {
    /**
     * CLAUDE.md hard rule 5 — the quota, not the flag.
     *
     * The rule protects Vercel's image-transformation quota, because exhausting
     * it makes every image return 402 in production. `unoptimized: true` was
     * one way to guarantee that, but it also stripped the `srcset`, so the
     * three derivatives the upload pipeline writes were reduced to one and a
     * phone downloaded the desktop file.
     *
     * A custom loader gives the same guarantee for the same reason — Next never
     * routes through `/_next/image` when one is set — while restoring the
     * srcset. `unoptimized` and `loader` cannot both be used: `unoptimized`
     * wins and the loader is silently ignored, which is why it is gone rather
     * than kept "for safety".
     *
     * `tests/image-loader.spec.ts` asserts that no request to `/_next/image` is
     * ever issued. That test is the actual enforcement of HR5 now.
     */
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",

    /*
      Exactly the three widths that exist on disk. Next builds the srcset from
      these, so leaving the defaults in place would generate candidate entries
      for widths the loader has to round anyway — eight URLs pointing at three
      files, and a browser choosing between duplicates.
    */
    deviceSizes: [400, 800, 1600],
    imageSizes: [400],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      // Future: Cloudflare R2 behind a custom domain (docs/07 § 10)
      // { protocol: "https", hostname: "media.thehousebossfl.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
