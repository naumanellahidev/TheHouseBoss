import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/**
 * Brand lockup.
 *
 * NOTE: this is the marketing lockup, NOT the legal disclosure. The FREC
 * brokerage-size rule applies to `<ComplianceFooter />`, which is a separate
 * component and must not be conflated with this one.
 *
 * ── The artwork ───────────────────────────────────────────────────────────
 *
 * The client's logo is expected at `public/logo/house-boss.png` (and, if
 * supplied, `house-boss-invert.png` for dark grounds). If the file is absent
 * the component falls back to the type-set lockup below, so the site never
 * renders a broken image — the same discipline `PropertyImage` follows.
 *
 * Whether the artwork exists is a BUILD-TIME constant (`HAS_ARTWORK`), not a
 * runtime check. A server component cannot stat the filesystem on Vercel's
 * runtime, and doing an existence check per render would be absurd for an asset
 * that either ships or does not.
 *
 * ── Why the image carries no text alternative of its own ──────────────────
 *
 * The artwork is a wordmark: it *is* the words "The House Boss". Its alt text
 * is therefore the brand name, and the sub-line is rendered as real text beside
 * it rather than baked into the picture, so it stays selectable, translatable
 * and legible to a screen reader.
 */

/**
 * Flip to `true` once `public/logo/house-boss.png` exists.
 *
 * Deliberately a single constant rather than a try/catch import: it makes the
 * state of the asset obvious in one place, and a missing file becomes a visible
 * fallback rather than a build failure.
 */
const HAS_ARTWORK = false;

const ARTWORK = {
  light: "/logo/house-boss.png",
  dark: "/logo/house-boss-invert.png",
} as const;

/**
 * Compact mark for tight spaces — the header at narrow widths, a favicon, an
 * avatar slot. Kept as SVG so it stays crisp at any size and costs nothing.
 */
export function LogoMark({
  className,
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="3"
        fill={invert ? "transparent" : "var(--color-royal-900)"}
        stroke="var(--color-azure-600)"
        strokeWidth="2"
      />
      <path
        d="M9 19.5 20 11l11 8.5"
        fill="none"
        stroke="var(--color-azure-600)"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <text
        x="20"
        y="30"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        letterSpacing="0.5"
        fill="var(--color-porcelain-50)"
        fontFamily="var(--font-body)"
      >
        THB
      </text>
    </svg>
  );
}

export function Logo({
  variant = "full",
  invert = false,
  href = "/",
  className,
  /**
   * Rendered width in px. The artwork is served at 3x and downscaled, so it
   * stays sharp on a high-density display without shipping a second file.
   */
  width = 200,
}: {
  variant?: "full" | "compact" | "stacked";
  invert?: boolean;
  href?: string | null;
  className?: string;
  width?: number;
}) {
  const inner = HAS_ARTWORK ? (
    <Image
      src={invert ? ARTWORK.dark : ARTWORK.light}
      alt={siteConfig.name}
      width={width}
      // The supplied artwork is roughly 3:2. Height is stated explicitly so the
      // header reserves the right box before the image loads — zero CLS (HR7).
      height={Math.round((width * 2) / 3)}
      priority
      className={cn(
        "h-auto w-auto object-contain",
        variant === "compact" ? "max-h-9" : "max-h-14",
      )}
    />
  ) : (
    <>
      <span
        className={cn(
          "font-display leading-none font-semibold tracking-[0.06em] uppercase",
          variant === "compact" ? "text-base" : "text-lg md:text-xl",
          invert ? "text-foreground-invert" : "text-foreground",
        )}
      >
        {siteConfig.name}
      </span>

      {variant !== "compact" ? (
        <span
          className={cn(
            "flex items-center gap-2 text-xs leading-none font-medium",
            invert ? "text-foreground-invert-muted" : "text-foreground-subtle",
          )}
        >
          <span aria-hidden="true" className="block h-0.5 w-8 bg-accent" />
          Powered by {siteConfig.brokerage}
        </span>
      ) : null}
    </>
  );

  const layout = cn(
    "flex min-w-0",
    variant === "stacked"
      ? "flex-col items-center gap-2 text-center"
      : "flex-col gap-1",
  );

  /*
    `className` goes on the OUTERMOST element, which is the link when there is
    one — not on an inner wrapper.

    The header renders two of these, one `lg:hidden` and one
    `hidden lg:inline-flex`. With the class on an inner span, the <a> stayed
    visible while its only text was display:none, and axe correctly reported
    "Links must have discernible text" on every page. A link whose label is
    hidden is a link a screen reader announces as nothing.
  */
  if (!href) {
    return <span className={cn(layout, className)}>{inner}</span>;
  }

  return (
    <Link
      href={href}
      // No aria-label: the visible text (or the image's alt) already names the
      // link, and an aria-label that differs from visible text fails WCAG 2.5.3.
      className={cn(
        layout,
        /*
          `min-h-11` is 44px, the minimum touch target (docs/03 § 9).

          Moving the layout classes onto the link fixed the missing accessible
          name but made the link only 24px tall in the `compact` variant, which
          has no sub-line under the wordmark. The responsive audit caught it at
          six widths. The logo is the primary way home on a phone — it owes the
          same target as any other control.
        */
        "min-h-11 justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      {inner}
    </Link>
  );
}
