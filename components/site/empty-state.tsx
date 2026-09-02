import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Every empty state teaches and offers a next action. A bare "0 results" is a
 * defect (docs/03-design-system.md § 11, docs/05-page-specs.md).
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-dashed border-border",
        "bg-surface px-6 py-12 text-center md:py-16",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-accent-wash text-accent-quiet"
      >
        <Icon className="size-6" />
      </span>

      <div className="flex max-w-[46ch] flex-col gap-2">
        <h3 className="text-h4 font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-foreground-muted">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
