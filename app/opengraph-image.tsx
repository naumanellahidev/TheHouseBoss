import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const alt = "The House Boss — Lake Mary & Central Florida Real Estate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social card. Listing and article routes get their own
 * opengraph-image with the property photo or cover (Phase 6).
 *
 * System fonts only — loading a webfont here costs build time on every
 * generation and the card does not need Fraunces to read as premium.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "radial-gradient(120% 90% at 12% 0%, #16263F 0%, #0A1420 100%)",
        padding: 72,
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            border: "3px solid #C9A227",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FDFCFA",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          THB
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              color: "#FDFCFA",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            The House Boss
          </div>
          {/* Satori: a div with more than one child needs display:flex, and
                `Powered by {value}` would be two text nodes — keep it one. */}
          <div
            style={{
              display: "flex",
              color: "#B9C2CD",
              fontSize: 18,
              letterSpacing: 1,
            }}
          >
            {`Powered by ${siteConfig.brokerage}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ width: 96, height: 6, background: "#C9A227" }} />
        <div
          style={{
            display: "flex",
            color: "#FDFCFA",
            fontSize: 62,
            lineHeight: 1.1,
            fontWeight: 600,
            maxWidth: 940,
          }}
        >
          {
            "Lake Mary Realtor for VA buyers, assumable mortgages and new construction"
          }
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 28,
          color: "#B9C2CD",
          fontSize: 20,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span>{siteConfig.legalName}</span>
        <span>·</span>
        <span>{siteConfig.licenses.realEstate.number}</span>
        <span>·</span>
        <span>{siteConfig.licenses.contractor.number}</span>
      </div>
    </div>,
    size,
  );
}
