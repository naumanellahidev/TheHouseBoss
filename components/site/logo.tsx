import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/**
 * Brand lockup — docs/03-design-system.md § 5.
 *
 * NOTE: this is the marketing lockup, NOT the legal disclosure. The FREC
 * brokerage-size rule applies to <ComplianceFooter />, which is a separate
 * component. Do not conflate the two.
 */

/** THB monogram inside a gold-ruled square. Scales cleanly to a favicon. */
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
        fill={invert ? "transparent" : "var(--color-ink-900)"}
        stroke="var(--color-gold-500)"
        strokeWidth="2"
      />
      {/* roofline — the "house" in House Boss */}
      <path
        d="M9 19.5 20 11l11 8.5"
        fill="none"
        stroke="var(--color-gold-500)"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <text
        x="20"
        y="30.5"
        textAnchor="middle"
        fill={invert ? "var(--color-bone-50)" : "var(--color-bone-50)"}
        style={{
          font: "600 11px var(--font-display)",
          letterSpacing: "0.08em",
        }}
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
}: {
  variant?: "full" | "compact" | "stacked";
  invert?: boolean;
  href?: string | null;
  className?: string;
}) {
  const wordmark = (
    <span
      className={cn(
        "font-display leading-none font-semibold tracking-[0.06em] uppercase",
        variant === "compact" ? "text-base" : "text-lg md:text-xl",
        invert ? "text-foreground-invert" : "text-foreground",
      )}
    >
      The House Boss
    </span>
  );

  const poweredBy = (
    <span
      className={cn(
        "text-xs leading-none font-medium tracking-[0.04em]",
        invert ? "text-foreground-invert-muted" : "text-foreground-subtle",
      )}
    >
      Powered by {siteConfig.brokerage}
    </span>
  );

  const goldRule = (
    <span aria-hidden="true" className="block h-0.5 w-8 bg-accent" />
  );

  const content =
    variant === "compact" ? (
      <span className="flex items-center gap-2.5">
        <LogoMark className="size-8" invert={invert} />
        {wordmark}
      </span>
    ) : variant === "stacked" ? (
      <span className="flex flex-col items-center gap-2 text-center">
        <LogoMark className="size-11" invert={invert} />
        {wordmark}
        {goldRule}
        {poweredBy}
      </span>
    ) : (
      <span className="flex items-center gap-3">
        <LogoMark invert={invert} />
        <span className="flex flex-col gap-1.5">
          {wordmark}
          <span className="flex items-center gap-2">
            {goldRule}
            {poweredBy}
          </span>
        </span>
      </span>
    );

  if (href === null) {
    return <span className={cn("inline-flex", className)}>{content}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        // min-h-11 keeps the tap target at 44px even though the compact
        // wordmark is only 32px tall (docs/04-responsive-spec.md § 2).
        "inline-flex min-h-11 items-center rounded-md py-1",
        "transition-opacity duration-(--dur-fast)",
        "hover:opacity-90",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      {content}
    </Link>
  );
}
