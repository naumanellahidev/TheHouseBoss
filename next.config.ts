import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    /**
     * CLAUDE.md hard rule 5. We pre-generate 1600/800/400 WebP in the upload
     * pipeline, so Vercel's transformation quota must not be consumed —
     * exhausting it makes images return 402 in production.
     */
    unoptimized: true,
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
