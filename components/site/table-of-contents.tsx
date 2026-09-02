"use client";

import * as React from "react";
import { ChevronDown, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type TocItem = { id: string; label: string };

/**
 * Guide navigation — docs/04-responsive-spec.md § 5, Guide pages.
 *
 * Desktop: a sticky sidebar list with the current section marked.
 * Mobile:  a reading-progress bar plus a collapsible list pinned under the
 *          header.
 *
 * Scroll spy uses IntersectionObserver rather than a scroll handler, and the
 * progress bar animates `transform` only, so neither costs a layout on scroll.
 */
export function TableOfContents({
  items,
  className,
}: {
  items: TocItem[];
  className?: string;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(
    items[0]?.id ?? null,
  );

  React.useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // Only count a heading as current once it is in the upper third.
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    for (const h of headings) observer.observe(h);
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    <nav aria-label="On this page" className={className}>
      <h2 className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
        On this page
      </h2>
      <ul className="mt-4 flex flex-col border-l border-border">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px flex min-h-9 items-center border-l-2 py-1.5 pl-4 text-sm",
                  "transition-colors duration-(--dur-fast)",
                  active
                    ? "border-l-accent font-medium text-foreground"
                    : "border-l-transparent text-foreground-muted hover:border-l-border-strong hover:text-foreground",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Reading progress + collapsible list. Rendered below 1024px only. */
export function MobileToc({ items }: { items: TocItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const frame = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (items.length < 3) return null;

  return (
    <div className="sticky top-(--header-h) z-30 -mx-5 border-b border-border bg-background/95 backdrop-blur-md lg:hidden">
      <div
        aria-hidden="true"
        className="h-0.5 origin-left bg-accent transition-transform duration-(--dur-fast)"
        style={{ transform: `scaleX(${progress})` }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-5 text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <List className="size-4 text-accent-quiet" aria-hidden="true" />
          On this page
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-foreground-subtle transition-transform duration-(--dur-base)",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul className="flex max-h-[50svh] flex-col overflow-y-auto border-t border-border px-5 pb-3">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center text-sm text-foreground-muted"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
