import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A small data card that overlaps the media behind it.
 *
 * This is the one piece of the modernised composition that does real work: it
 * puts a credential or a live figure physically on top of the photograph, which
 * is what separates an editorial layout from a stack of rectangles.
 *
 * Surface treatment comes from the `glass` utility; **positioning is the
 * caller's job**, because every placement differs. Glass is legitimate here
 * because everything in this card is a short, large, high-contrast label over a
 * backdrop we chose — never body text (docs/03 § 3). Callers should position with
 * `absolute` inside a `MediaFrame`, and must check 360px — an overlapping card
 * is the easiest way to introduce horizontal overflow. The usual pattern is to
 * stack these below the image on mobile and only overlap from `md` up.
 */
export function FloatCard({
  icon: Icon,
  label,
  value,
  caption,
  className,
}: {
  icon?: LucideIcon;
  /** The quiet line above the figure, e.g. "Median sale price". */
  label: string;
  /** The figure itself. Kept as a node so a caller can pass formatted price markup. */
  value: React.ReactNode;
  /**
   * Optional qualifier. On any statistic this is where the "as of" date goes —
   * docs/05 is explicit that a market number without its date is never shown.
   */
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass flex items-start gap-3 rounded-lg p-4", className)}>
      {Icon ? (
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-quiet"
        >
          <Icon className="size-5" />
        </span>
      ) : null}

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
          {label}
        </span>
        <span className="text-h4 font-semibold text-foreground tabular">
          {value}
        </span>
        {caption ? (
          <span className="text-xs text-foreground-subtle">{caption}</span>
        ) : null}
      </span>
    </div>
  );
}
