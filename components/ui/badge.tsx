import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status badges pair color with TEXT — color is never the only carrier of
 * meaning (docs/03-design-system.md § 9).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-overline leading-none font-semibold tracking-[0.12em] uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-foreground-muted",
        active: "bg-success-bg text-success",
        coming: "bg-info-bg text-info",
        pending: "bg-warning-bg text-warning",
        sold: "bg-royal-900 text-accent-invert",
        accent: "bg-accent-wash text-accent-quiet",
        outline: "border border-border-strong text-foreground-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Maps a listing status to its badge tone and label. */
export const listingStatusBadge = {
  active: { tone: "active", label: "Active" },
  coming_soon: { tone: "coming", label: "Coming Soon" },
  pending: { tone: "pending", label: "Pending" },
  sold: { tone: "sold", label: "Sold" },
  off_market: { tone: "neutral", label: "Off Market" },
} as const;

export { badgeVariants };
