"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import type { SiteSettings } from "@/types/domain";
import { MobileNav } from "@/components/site/mobile-nav";
import { isGroup, primaryNav, type NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";


/**
 * The site header. 72px mobile / 96px desktop.
 *
 * ── It floats; it does not sit on a bar ───────────────────────────────────
 *
 * At the top of the page it paints nothing at all, so a dark hero runs the full
 * height of the viewport and the logo sits on the photograph rather than on a
 * white strip above it. After 8px of scroll it acquires a translucent
 * background, a blur and a bottom border, because from that point it is over
 * content rather than over a hero and needs to be separable from it.
 *
 * `data-at-top` is the whole state, and everything that depends on it —
 * whether the hero bleeds up behind the bar, and whether the nav is light ink
 * or dark — is decided in `app/globals.css`. The reasoning is there, next to
 * the rules.
 *
 * ── The pill navigation ───────────────────────────────────────────────────
 *
 * The items sit in one rounded tray and the current page is a solid pill inside
 * it, the same language as the admin panel. The tray and pill colours are the
 * `--nav-*` variables, which flip with the header's tone.
 *
 * docs/04-responsive-spec.md § 3.
 */
export function Header({ settings }: { settings?: SiteSettings | null }) {
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
      data-site-header
      /*
        Present while the bar is at the top of the page and absent once it is
        not — an attribute rather than a value, so the CSS reads
        `[data-at-top]` and cannot be defeated by a stale "false" string.
      */
      data-at-top={scrolled ? undefined : ""}
      className={cn(
        "fixed top-0 z-40 w-full",
        "transition-[background-color,box-shadow,border-color] duration-(--dur-base) ease-(--ease-out)",
        scrolled
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-(--header-h) items-center justify-between gap-4 lg:h-(--header-h-lg)">
        {/*
          `tone="auto"` renders both uploaded marks and lets CSS pick.

          The bar is transparent over a dark hero and light once it has
          scrolled, so the artwork under it changes background halfway down
          the page — and a mark drawn for a white page has black lettering
          that disappears on navy. Nothing here can know where the reader
          is; the rule that chooses is in app/globals.css.

          Costs a second request only when a dark-background logo has
          actually been uploaded. With one key this is what it always was.
        */}
        <Logo variant="compact" tone="auto" className="lg:hidden" settings={settings} />
        <Logo
          variant="full"
          tone="auto"
          className="hidden lg:inline-flex"
          settings={settings}
        />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul
            className={cn(
              "flex items-center gap-0.5 rounded-full border p-1",
              "border-(--nav-tray-border) bg-(--nav-tray) shadow-xs backdrop-blur-md",
              "transition-colors duration-(--dur-base) ease-(--ease-out)",
            )}
          >
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
            className="hidden rounded-full px-6 sm:inline-flex"
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

/*
  One pill. 36px tall inside the 44px tray: the desktop nav only exists from
  1024px, where the target floor is WCAG 2.2's 24px (tests/pages.ts).

  `px-2.5` until 1280. Seven items and a hero-sized logo share the row at 1024,
  and "Hire Contractor" wrapping onto two lines is what happened the last time
  the padding was generous there.
*/
const pill = cn(
  "inline-flex h-9 items-center rounded-full text-sm font-semibold whitespace-nowrap",
  "transition-colors duration-(--dur-fast) ease-(--ease-out)",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--nav-ring)",
);

const pillTone = (active: boolean) =>
  active
    ? "bg-(--nav-active-bg) text-(--nav-active-fg)"
    : "text-(--nav-fg-muted) hover:bg-(--nav-hover) hover:text-(--nav-fg)";

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
      className={cn(pill, "px-2.5 xl:px-4", pillTone(active))}
    >
      {children}
    </Link>
  );
}

/**
 * A group: its label is a link, the chevron beside it opens the menu.
 *
 * The label used to be the trigger itself, which left "Homes" unable to go
 * anywhere and forced a separate "Home" item beside it. Splitting the two means
 * the label behaves like every other item in the bar, and the menu is still one
 * hover, one click or one Tab away. Opens on pointer enter, on the chevron's
 * click, and on keyboard focus — never hover-only (docs/04 § 2).
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
  const menuId = React.useId();

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
      {/* The two halves share one pill, so active and hover read as one item. */}
      <div className={cn("flex items-center rounded-full", pillTone(Boolean(active)))}>
        {group.href ? (
          <Link
            href={group.href}
            aria-current={group.href && isActive(pathname, group.href) ? "page" : undefined}
            className={cn(pill, "pr-0.5 pl-2.5 hover:bg-transparent xl:pl-4")}
          >
            {group.label}
          </Link>
        ) : (
          <span className={cn(pill, "pr-0.5 pl-2.5 xl:pl-4")}>{group.label}</span>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={open ? menuId : undefined}
          aria-label={`${group.label} menu`}
          onClick={() => setOpen((v) => !v)}
          className={cn(pill, "w-7 justify-center pr-1 hover:bg-transparent xl:w-8 xl:pr-2")}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-(--dur-base) ease-(--ease-out)",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open && (
        <div
          id={menuId}
          className={cn(
            "absolute top-full left-0 z-50 min-w-64 pt-3",
            "motion-safe:animate-in motion-safe:fade-in",
          )}
        >
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 flex-col justify-center gap-0.5 rounded-xl px-3 py-2",
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
