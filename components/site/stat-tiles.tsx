import * as React from "react";

import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

/**
 * 2 columns on mobile, 4 from 768px (docs/04-responsive-spec.md § 4).
 *
 * `asOf` is not optional decoration: every statistic on this site must display
 * the date it was true (docs/14-content-plan.md § 1, rule 4).
 */
export function StatTiles({
  stats,
  asOf,
  invert = false,
  columns = 4,
  className,
}: {
  stats: Stat[];
  asOf?: string;
  invert?: boolean;
  columns?: 3 | 4;
  className?: string;
}) {
  if (stats.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <dl
        className={cn(
          "grid grid-cols-2 gap-3 md:gap-4",
          columns === 4 ? "md:grid-cols-4" : "md:grid-cols-3",
        )}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-4 md:p-5",
              invert
                ? "border-royal-700 bg-royal-800"
                : "border-border bg-surface shadow-xs",
            )}
          >
            <dt
              className={cn(
                "text-overline font-semibold tracking-[0.12em] uppercase",
                invert ? "text-azure-400" : "text-accent-quiet",
              )}
            >
              {stat.label}
            </dt>
            {/* The hint lives inside the <dd>: a <div> inside a <dl> may
                contain only a dt/dd group, nothing else. */}
            <dd
              className={cn(
                "flex flex-col gap-1",
                invert ? "text-foreground-invert" : "text-foreground",
              )}
            >
              <span className="text-h3 font-semibold tabular">
                {stat.value}
              </span>
              {stat.hint ? (
                <span
                  className={cn(
                    "text-xs",
                    invert
                      ? "text-foreground-invert-muted"
                      : "text-foreground-subtle",
                  )}
                >
                  {stat.hint}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {asOf ? (
        <p
          className={cn(
            "text-xs",
            invert ? "text-foreground-invert-muted" : "text-foreground-subtle",
          )}
        >
          Data as of {asOf}. Market figures change; ask for a current analysis.
        </p>
      ) : null}
    </div>
  );
}
