import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The heading block every admin screen opens with.
 *
 * Renders an <h2>, not an <h1>: the shell's top bar already carries the page
 * title as the document's single h1, and a second h1 is the validity trap that
 * axe catches late (design-system skill, HTML validity traps).
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-h3">{title}</h2>
        {description ? (
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
