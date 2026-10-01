import type { Metadata, Viewport } from "next";

import { ServiceWorker } from "@/components/site/service-worker";
import { preconnect } from "react-dom";

import { fontVariables } from "@/app/fonts";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "The House Boss | Lake Mary & Central Florida Real Estate",
    template: "%s | The House Boss",
  },
  description: siteConfig.positioning,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  publisher: siteConfig.brokerage,
  /*
    Google Search Console ownership.

    Next renders this as <meta name="google-site-verification"> in <head> on
    every page, so it verifies whichever property is claimed — the apex, the
    www host, or both. The token is in lib/site-config.ts.
  */
  verification: { google: siteConfig.googleSiteVerification },
  formatDetection: { telephone: true, address: false, email: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  /*
    iOS reads almost nothing from the web app manifest.

    What makes Add to Home Screen open without Safari chrome on an iPhone is
    this block — the apple-mobile-web-app-capable meta and the status bar
    style — plus the apple-touch-icon above. Android and desktop Chrome read
    app/manifest.ts instead, which is why both exist.

    black-translucent lets the navy chrome run under the status bar rather
    than leaving a white strip above it. The admin shell already carries
    safe-area padding, so nothing ends up under the notch.
  */
  appleWebApp: {
    capable: true,
    title: "House Boss",
    statusBarStyle: "black-translucent",
  },
  /*
    Geo meta tags. Google ignores these — it takes location from the Business
    Profile and the JSON-LD — but Bing and a number of local directories still
    read them, and they cost nothing. The position is Lake Mary city centre,
    not her address: this is a service-area business (lib/site-config.ts).
  */
  other: {
    /*
      The legacy iOS name, added by hand.

      Next emits the standardised mobile-web-app-capable for appleWebApp.capable,
      and Safari has honoured that only since iOS 15.4. An iPhone on anything
      older reads the apple- prefixed one or opens the app in a Safari window
      with the address bar — which is the whole thing installing it was meant
      to avoid. Both are harmless together.
    */
    "apple-mobile-web-app-capable": "yes",
    "geo.region": "US-FL",
    "geo.placename": siteConfig.contact.address.locality,
    "geo.position": `${siteConfig.geo.latitude};${siteConfig.geo.longitude}`,
    ICBM: `${siteConfig.geo.latitude}, ${siteConfig.geo.longitude}`,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFCFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1B2D" },
  ],
  width: "device-width",
  initialScale: 1,
  // Never restrict zoom — WCAG 1.4.4 / 1.4.10.
  maximumScale: 5,
};

/**
 * Every photograph on the site is served from Supabase Storage, a different
 * origin from the page. Without a hint, the browser only opens that connection
 * (DNS, TCP, TLS — three round trips, ~450 ms on Lighthouse's mobile profile)
 * when it reaches the first image, which on every photo-led page is the LCP
 * element. `preconnect` starts it the moment the <head> arrives, in parallel
 * with the HTML still streaming. No `crossOrigin`: images are fetched no-cors,
 * and a CORS preconnect would open a second, unused connection.
 */
const MEDIA_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_MEDIA_URL
      ? new URL(process.env.NEXT_PUBLIC_MEDIA_URL).origin
      : null;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (MEDIA_ORIGIN) preconnect(MEDIA_ORIGIN);

  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        {/*
          Registers the service worker, which is what makes the site
          installable and gives an offline tap a page that explains itself.
          It renders nothing and waits for load, so it costs the first paint
          nothing.
        */}
        <ServiceWorker />
      </body>
    </html>
  );
}
