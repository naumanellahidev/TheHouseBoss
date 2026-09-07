import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The headline tiles, with a direction (brief §105).
 *
 * ── Why a delta and not a bigger number ───────────────────────────────────
 *
 * The dashboard used to show six identical boxes: a label and a total. "New
 * leads (7d): 4" is a fact with no meaning attached — four is good if last week
 * was one and bad if last week was twelve, and nothing on the screen said
 * which. The arrow is what turns it into information.
 *
 * ── Why only the leads tile carries one ───────────────────────────────────
 *
 * Because it is the only one where a week-on-week comparison means anything.
 * "Published listings, up 2 on last week" is noise — inventory does not move
 * weekly and the number is already visible. Putting a delta on every tile
 * because it looks impressive is exactly the invented-metric habit §30 rules
 * out; a tile with nothing useful to compare simply does not compare.
 */
export function PulseTile({
  label,
  value,
  href,
  delta,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  href: string;
  /** Previous period, when a comparison is genuinely meaningful. */
  delta?: { current: number; previous: number };
  hint?: string;
  emphasis?: boolean;
}) {
  const change = delta ? delta.current - delta.previous : null;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border p-4 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        emphasis
          ? "border-accent/30 bg-accent-wash hover:border-accent/50"
          : "border-border bg-surface hover:bg-surface-sunken",
      )}
    >
      <span className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
        {label}
      </span>

      <span className="flex items-baseline gap-2.5">
        <span className="tabular text-h2 font-semibold text-foreground">{value}</span>

        {change !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-medium",
              change > 0 && "text-success",
              change < 0 && "text-danger",
              change === 0 && "text-foreground-subtle",
            )}
          >
            {change > 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : change < 0 ? (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            ) : (
              <Minus className="size-3.5" aria-hidden="true" />
            )}
            {/*
              The absolute change, not a percentage.

              Going from 1 lead to 4 is "+300%", which is technically true and
              tells a small business nothing. "+3" is the number they actually
              think in.
            */}
            <span className="tabular">{change === 0 ? "same" : Math.abs(change)}</span>
            <span className="sr-only">
              {change > 0 ? "more" : "fewer"} than the previous seven days
            </span>
          </span>
        ) : null}
      </span>

      {hint ? (
        <span className="text-xs text-foreground-muted">{hint}</span>
      ) : null}
    </Link>
  );
}

/**
 * A labelled breakdown bar — the lead pipeline, the inventory by status.
 *
 * ── Why a bar and not a pie or a donut ────────────────────────────────────
 *
 * There are four or five categories and the useful questions are "which is
 * biggest" and "how much of the whole is it". A stacked bar answers both by
 * length, which people compare accurately; a donut answers them by angle, which
 * they do not. It is also one element rather than a chart library.
 */
export function BreakdownBar({
  title,
  href,
  segments,
  emptyLabel,
}: {
  title: string;
  href: string;
  segments: { label: string; count: number; tone: string }[];
  emptyLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-h4 font-semibold">{title}</h3>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-quiet underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Open
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-sm text-foreground-muted">{emptyLabel}</p>
      ) : (
        <>
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken"
            role="img"
            aria-label={segments
              .map((s) => `${s.label}: ${s.count}`)
              .join(", ")}
          >
            {segments.map((segment) =>
              segment.count > 0 ? (
                <span
                  key={segment.label}
                  className={segment.tone}
                  style={{ width: `${(segment.count / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
            {segments
              .filter((segment) => segment.count > 0)
              .map((segment) => (
                <li
                  key={segment.label}
                  className="flex items-center gap-2 text-sm text-foreground-muted"
                >
                  <span
                    aria-hidden="true"
                    className={cn("size-2 rounded-full", segment.tone)}
                  />
                  {segment.label}
                  <span className="tabular font-semibold text-foreground">
                    {segment.count}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
