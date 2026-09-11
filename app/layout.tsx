import type { Metadata, Viewport } from "next";

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
  formatDetection: { telephone: true, address: false, email: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  /*
    Geo meta tags. Google ignores these — it takes location from the Business
    Profile and the JSON-LD — but Bing and a number of local directories still
    read them, and they cost nothing. The position is Lake Mary city centre,
    not her address: this is a service-area business (lib/site-config.ts).
  */
  other: {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
