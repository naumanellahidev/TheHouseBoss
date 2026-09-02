"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { isGroup, primaryNav, type NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";


/**
 * Sticky header. 64px mobile / 80px desktop. The bottom border and backdrop
 * blur appear only after 8px of scroll so the hero reads as full-bleed.
 * docs/04-responsive-spec.md § 3.
 */
export function Header() {
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Sync once after paint, in case the page was restored mid-scroll. Doing
    // it in a frame rather than in the effect body avoids a cascading render.
    const frame = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        "transition-[background-color,box-shadow,border-color] duration-(--dur-base) ease-(--ease-out)",
        scrolled
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-background",
      )}
    >
      <div className="container-page flex h-(--header-h) items-center justify-between gap-4 lg:h-(--header-h-lg)">
        <Logo variant="compact" className="lg:hidden" />
        <Logo variant="full" className="hidden lg:inline-flex" />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((entry) => (
              <li key={entry.label}>
                {isGroup(entry) ? (
                  <DesktopDropdown group={entry} pathname={pathname} />
                ) : (
                  <TopLink href={entry.href} pathname={pathname}>
                    {entry.label}
                  </TopLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* size="md" (44px), not sm — tablets are touch viewports and the
              44px minimum applies there (docs/04-responsive-spec.md § 2). */}
          <Button
            variant="accent"
            size="md"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/contact">Contact</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function TopLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-11 items-center rounded-md px-3 text-sm font-medium",
        "transition-colors duration-(--dur-fast) ease-(--ease-out)",
        active
          ? "text-foreground"
          : "text-foreground-muted hover:text-foreground",
        "after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:origin-left after:bg-accent",
        "after:transition-transform after:duration-(--dur-base) after:ease-(--ease-out)",
        active
          ? "after:scale-x-100"
          : "after:scale-x-0 hover:after:scale-x-100",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Hover-and-focus dropdown. Opens on pointer enter, on click, and on keyboard
 * focus — never hover-only (docs/04 § 2).
 */
function DesktopDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  React.useEffect(() => () => cancelClose(), []);

  // Close on navigation — adjusted during render, not in an effect.
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const active =
    (group.href && isActive(pathname, group.href)) ||
    group.items.some((i) => isActive(pathname, i.href));

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm font-medium",
          "transition-colors duration-(--dur-fast) ease-(--ease-out)",
          active
            ? "text-foreground"
            : "text-foreground-muted hover:text-foreground",
        )}
      >
        {group.label}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform duration-(--dur-base) ease-(--ease-out)",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 min-w-64 pt-2",
            "motion-safe:animate-in motion-safe:fade-in",
          )}
        >
          <ul className="overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-lg">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 flex-col justify-center gap-0.5 rounded-md px-3 py-2",
                    "transition-colors duration-(--dur-fast)",
                    "hover:bg-surface-sunken focus-visible:bg-surface-sunken",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="text-xs text-foreground-subtle">
                      {item.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
