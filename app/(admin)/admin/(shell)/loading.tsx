import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant feedback for every admin tab.
 *
 * The admin is fully dynamic — every page reads live data behind an auth
 * check — so a click on a sidebar link waits for the server before anything
 * changes. With no loading boundary anywhere under /admin, that wait showed as
 * nothing at all: the old page stayed on screen, frozen, until the new one
 * arrived. That is most of what "tab switching feels slow" meant.
 *
 * This one file covers every page in the shell. Next prefetches loading
 * boundaries for dynamic routes, so on click the sidebar stays put and this
 * skeleton replaces the content area immediately; the real page streams in
 * behind it. It is shaped like the common admin page — a header, a row of
 * tiles, a list — so the swap is not a jolt.
 *
 * `role="status"` with a visually hidden label, so a screen reader hears that
 * something is happening rather than silence.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-12 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
