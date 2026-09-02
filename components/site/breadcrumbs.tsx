import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Crumb = { href: string; label: string };

/**
 * Visible breadcrumb. The BreadcrumbList JSON-LD is generated from the SAME
 * `items` array (lib/seo/breadcrumbs.ts) so the two can never disagree.
 */
export function Breadcrumbs({
  items,
  invert = false,
  className,
}: {
  items: Crumb[];
  invert?: boolean;
  className?: string;
}) {
  const trail: Crumb[] = [{ href: "/", label: "Home" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={cn(
          "scroll-row items-center gap-1.5 text-xs",
          invert ? "text-foreground-invert-muted" : "text-foreground-subtle",
        )}
      >
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.href} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 opacity-60"
                />
              )}
              {last ? (
                <span
                  aria-current="page"
                  className={cn(
                    "font-medium",
                    invert ? "text-foreground-invert" : "text-foreground",
                  )}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    "rounded-sm transition-colors duration-(--dur-fast)",
                    invert
                      ? "hover:text-foreground-invert"
                      : "hover:text-foreground",
                  )}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
