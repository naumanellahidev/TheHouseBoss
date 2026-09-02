import { ImageResponse } from "next/og";

/**
 * The shared Open Graph card — docs/08 § 5, task 6.
 *
 * One layout, used by the site default and by the per-listing, per-article and
 * per-city routes. A social card is the only place a visitor sees this site
 * before deciding whether to click, so it carries the two things that
 * distinguish her from every other agent: the brand lockup and both licence
 * numbers.
 *
 * Colour literals are unavoidable here. Satori renders this with an inline
 * style object and cannot read a CSS custom property, which is the same reason
 * the email templates inline them. The values are copied from the @theme block
 * and `scripts/check-tokens.mjs` allowlists this file for that reason.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK_950 = "#0a1420";
const INK_800 = "#16263f";
const GOLD_500 = "#c9a227";
const GOLD_400 = "#ddbb4c";
const BONE_50 = "#fdfcfa";
const BONE_MUTED = "#b9c2cd";

export type OgCardProps = {
  /** The small line above the headline — a city, a price, a section. */
  eyebrow?: string;
  title: string;
  /** One supporting line. Kept short; anything long is unreadable at card size. */
  subtitle?: string;
  /** Bottom-right, e.g. "4 bed · 3 bath · 2,410 sq ft". */
  facts?: string;
};

export function ogCard({ eyebrow, title, subtitle, facts }: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: `linear-gradient(135deg, ${INK_800} 0%, ${INK_950} 65%)`,
        color: BONE_50,
        fontFamily: "sans-serif",
      }}
    >
      {/* Brand lockup */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          The House Boss
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 3, background: GOLD_500 }} />
          <div style={{ fontSize: 18, color: GOLD_400, letterSpacing: "0.08em" }}>
            Powered by World Properties Group
          </div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 22,
              color: GOLD_400,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            fontSize: title.length > 60 ? 52 : 64,
            fontWeight: 700,
            lineHeight: 1.12,
            // Satori has no line clamp; the callers trim instead.
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div style={{ fontSize: 28, color: BONE_MUTED, maxWidth: 900 }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      {/* Credentials — the differentiator, on every card */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderTop: `1px solid ${INK_800}`,
          paddingTop: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Krisi Kakarova</div>
          <div style={{ fontSize: 17, color: BONE_MUTED }}>
            Realtor SL3327932 · Certified Residential Contractor CRC1335654
          </div>
        </div>

        {facts ? (
          <div style={{ fontSize: 22, color: GOLD_400 }}>{facts}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Trims to a length that still reads at card size, on a word boundary. */
export function ogTrim(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:-]+$/, "")}…`;
}

export function ogResponse(props: OgCardProps) {
  return new ImageResponse(ogCard(props), OG_SIZE);
}
