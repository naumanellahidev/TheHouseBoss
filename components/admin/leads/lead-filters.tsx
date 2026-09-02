"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lead inbox filters plus the CSV export — docs/06 § 8.
 *
 * The export link carries the CURRENT filters, so "export what I am looking
 * at" is the default behaviour rather than a separate dialog.
 */

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
];

const TYPES = [
  { value: "", label: "All enquiries" },
  { value: "general", label: "General" },
  { value: "listing_inquiry", label: "Listing" },
  { value: "showing_request", label: "Showing request" },
  { value: "seller", label: "Seller" },
  { value: "va", label: "VA" },
  { value: "assumable", label: "Assumable" },
  { value: "new_construction", label: "New construction" },
];

const controlClass = cn(
  "h-11 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function LeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("q") ?? "");

  const push = React.useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      // Changing the filter can hide the currently open lead; dropping the
      // selection avoids a detail pane that does not match the list beside it.
      next.delete("lead");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => push({ q: search || null }), 400);
    return () => clearTimeout(timer);
  }, [search, params, push]);

  const exportParams = new URLSearchParams();
  for (const key of ["status", "type", "q"]) {
    const value = params.get(key);
    if (value) exportParams.set(key, value);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, email or phone"
          aria-label="Search leads"
          className={cn(controlClass, "w-full pl-9")}
        />
      </div>

      <select
        value={params.get("status") ?? ""}
        onChange={(event) => push({ status: event.target.value })}
        aria-label="Filter by status"
        className={controlClass}
      >
        {STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={params.get("type") ?? ""}
        onChange={(event) => push({ type: event.target.value })}
        aria-label="Filter by enquiry type"
        className={controlClass}
      >
        {TYPES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <Button asChild variant="outline" className="sm:ml-auto">
        <a href={`/api/admin/leads/export?${exportParams.toString()}`}>
          <Download aria-hidden="true" />
          Export CSV
        </a>
      </Button>
    </div>
  );
}
