import { HardDrive } from "lucide-react";

import { formatBytes, storageLevel } from "@/lib/storage/budget";
import { cn } from "@/lib/utils";
import type { StorageUsage } from "@/types/domain";

/**
 * The 1 GB Supabase Storage ceiling is the binding constraint of this project
 * (docs/07 § 1), so the meter lives in the sidebar permanently — in her line of
 * sight, not on a page she has to go and find.
 *
 * Colour alone never carries the state: the percentage and a word ("Healthy",
 * "Getting full", "Nearly full") are always rendered (docs/03 § 9).
 */

export function StorageMeter({
  usage,
  variant = "sidebar",
  className,
}: {
  usage: StorageUsage;
  variant?: "sidebar" | "panel";
  className?: string;
}) {
  const percent = Math.min(
    100,
    Math.round((usage.totalBytes / usage.limitBytes) * 100),
  );
  const level = storageLevel(usage);
  const invert = variant === "sidebar";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 text-overline font-semibold tracking-[0.12em] uppercase",
            invert ? "text-azure-400" : "text-accent-quiet",
          )}
        >
          <HardDrive className="size-3.5" aria-hidden="true" />
          Storage
        </span>
        <span
          className={cn(
            "text-xs font-semibold tabular",
            invert ? "text-foreground-invert" : "text-foreground",
          )}
        >
          {percent}%
        </span>
      </div>

      {/* A native progress element carries the value to assistive tech without
          a hand-rolled role/aria-valuenow trio. */}
      <div
        className={cn(
          "h-1.5 w-full overflow-hidden rounded-full",
          invert ? "bg-royal-800" : "bg-surface-sunken",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-(--dur-base)", level.bar)}
          style={{ width: `${Math.max(percent, 1)}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage used: ${percent} percent, ${level.label}`}
        />
      </div>

      <p
        className={cn(
          "text-xs",
          invert ? "text-foreground-invert-muted" : "text-foreground-subtle",
        )}
      >
        {formatBytes(usage.totalBytes)} of {formatBytes(usage.limitBytes)} ·{" "}
        {level.label}
      </p>
    </div>
  );
}
