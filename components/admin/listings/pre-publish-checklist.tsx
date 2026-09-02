"use client";

import { Check, X } from "lucide-react";

import { prePublishChecklist, type ListingInput } from "@/lib/validation/listing";
import { cn } from "@/lib/utils";

/**
 * The pre-publish checklist — docs/06 § 4, Tab 6.
 *
 * The Publish button is disabled until every item passes, so every unmet item
 * has to say what to do AND link to the tab that fixes it. A disabled button
 * with no explanation is the single most common admin-UI defect.
 *
 * The list itself comes from `lib/validation/listing.ts`, the same module the
 * server action re-validates with, so the UI and the write path can never
 * disagree about what "publishable" means.
 */
export function PrePublishChecklist({
  values,
  onGoToTab,
  className,
}: {
  values: Partial<ListingInput>;
  onGoToTab: (tab: string) => void;
  className?: string;
}) {
  const items = prePublishChecklist(values);
  const passed = items.filter((item) => item.ok).length;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Before publishing</h3>
        <span className="text-sm text-foreground-muted tabular">
          {passed} of {items.length}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            {item.ok ? (
              <span className="flex min-h-11 items-center gap-2.5 text-sm text-foreground-muted">
                <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                {item.label}
                <span className="sr-only"> — done</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onGoToTab(item.tab)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-md text-left text-sm font-medium text-foreground",
                  "hover:bg-surface-sunken",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <X className="size-4 shrink-0 text-danger" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs text-accent-quiet underline underline-offset-4">
                  Fix on {item.tab}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
