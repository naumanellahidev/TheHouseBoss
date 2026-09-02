"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Admin pagination, 25 per page (admin-crud skill).
 *
 * Real links, not buttons: the page number belongs in the URL, so a row opened
 * from page 3 comes back to page 3, and middle-click still opens a new tab.
 */
export function AdminPagination({
  page,
  pageCount,
  total,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  className?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pageCount <= 1) {
    return (
      <p className={cn("text-xs text-foreground-subtle", className)}>
        {total} {total === 1 ? "result" : "results"}
      </p>
    );
  }

  const href = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const linkClass = cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-strong px-4 text-sm font-medium",
    "text-foreground transition-colors duration-(--dur-fast) hover:bg-surface-sunken",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  const disabledClass =
    "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-4 text-sm font-medium text-foreground-subtle opacity-50";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-xs text-foreground-muted tabular">
        Page {page} of {pageCount} · {total} {total === 1 ? "result" : "results"}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass} rel="prev">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden="true">
            <ChevronLeft className="size-4" />
            Previous
          </span>
        )}

        {page < pageCount ? (
          <Link href={href(page + 1)} className={linkClass} rel="next">
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden="true">
            Next
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
