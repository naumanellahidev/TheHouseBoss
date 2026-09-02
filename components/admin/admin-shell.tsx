"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, User } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { adminNav, isActiveAdminRoute } from "@/lib/admin-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

/**
 * Admin chrome — docs/06 § 2.
 *
 *   >=1024px  240px sidebar with labels
 *   768–1023  64px icon rail (labels become accessible names + tooltips)
 *   <768px    drawer behind a menu button
 *
 * Client component because it needs the current pathname and the drawer state.
 * Everything it renders is passed in as props from the server layout, so no
 * data fetching crosses this boundary.
 */

export type AdminShellProps = {
  children: React.ReactNode;
  newLeads: number;
  userEmail: string;
  userName: string | null;
  /** Rendered inside the sidebar footer; the server builds it. */
  storage: React.ReactNode;
  /** Drives the collapsed icon-rail meter, which cannot fit the full component. */
  storagePercent: number;
  storageBar: string;
};

export function AdminShell({
  children,
  newLeads,
  userEmail,
  userName,
  storage,
  storagePercent,
  storageBar,
}: AdminShellProps) {
  const pathname = usePathname();

  // A route change must close the drawer, or navigating leaves it covering the
  // page it just navigated to. The route it was opened on is stored WITH the
  // open flag and the two are compared during render, so no effect and no
  // cascading re-render is needed to close it.
  const [drawer, setDrawer] = React.useState({ open: false, at: pathname });
  const drawerOpen = drawer.open && drawer.at === pathname;
  const setDrawerOpen = (open: boolean) => setDrawer({ open, at: pathname });

  const current = adminNav.find((item) => isActiveAdminRoute(pathname, item.href));

  return (
    <div className="flex min-h-dvh bg-surface-sunken">
      {/* ── Sidebar / icon rail: 768px and up ─────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border-invert bg-surface-invert md:flex md:w-16 lg:w-60">
        <div className="flex h-16 items-center justify-center border-b border-border-invert lg:justify-start lg:px-5">
          <Link
            href="/admin"
            className={cn(
              "inline-flex min-h-11 items-center rounded-md px-2 font-display text-base font-semibold tracking-[0.06em] text-foreground-invert uppercase",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
            )}
          >
            <span className="lg:hidden">THB</span>
            <span className="hidden lg:inline">The House Boss</span>
          </Link>
        </div>

        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto p-2 lg:p-3">
          <ul className="flex flex-col gap-1">
            {adminNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  active={isActiveAdminRoute(pathname, item.href)}
                  count={item.badge === "leads" ? newLeads : 0}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* The meter is the constraint that will actually bite, so it stays
            visible at every width above 768px (docs/06 § 2). The full meter
            needs ~200px; at the 64px icon rail it collapses to a bar and a
            percentage, which is still enough to notice a change. */}
        <div className="border-t border-border-invert p-3">
          <div className="hidden lg:block">{storage}</div>
          <Link
            href="/admin/media"
            aria-label={`Storage: ${storagePercent}% of 1 GB used`}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-md lg:hidden",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
            )}
          >
            <span className="h-1.5 w-8 overflow-hidden rounded-full bg-ink-800">
              <span
                aria-hidden="true"
                className={cn("block h-full rounded-full", storageBar)}
                style={{ width: `${Math.max(storagePercent, 4)}%` }}
              />
            </span>
            <span aria-hidden="true" className="text-overline font-semibold text-gold-400 tabular">
              {storagePercent}%
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger
              className={cn(
                "-ml-2 inline-flex size-11 items-center justify-center rounded-md text-foreground-muted md:hidden",
                "hover:bg-surface-sunken hover:text-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
              aria-label="Open dashboard menu"
            >
              <Menu className="size-5" aria-hidden="true" />
            </SheetTrigger>

            <SheetContent
              side="right"
              title="Dashboard"
              description="Dashboard sections"
            >
              <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto p-3">
                <ul className="flex flex-col gap-1">
                  {adminNav.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={isActiveAdminRoute(pathname, item.href)}
                        count={item.badge === "leads" ? newLeads : 0}
                        forceLabel
                      />
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="border-t border-border-invert p-4">{storage}</div>
            </SheetContent>
          </Sheet>

          <h1 className="min-w-0 flex-1 truncate text-h4 font-semibold text-foreground">
            {current?.label ?? "Dashboard"}
          </h1>

          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground-muted",
              "hover:bg-surface-sunken hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">View site</span>
            <span className="sr-only sm:hidden">View site (opens in a new tab)</span>
          </Link>

          <UserMenu email={userEmail} name={userName} />
        </header>

        <main id="main" className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  count,
  forceLabel = false,
}: {
  item: (typeof adminNav)[number];
  active: boolean;
  count: number;
  forceLabel?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      // At the icon-rail width the visible text is hidden but stays in the
      // accessible name — the link is never left unnamed (WCAG 2.4.4).
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
        active
          ? "bg-ink-800 text-foreground-invert"
          : "text-foreground-invert-muted hover:bg-ink-800 hover:text-foreground-invert",
        !forceLabel && "md:justify-center lg:justify-start",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className={cn("flex-1 truncate", !forceLabel && "md:sr-only lg:not-sr-only")}>
        {item.label}
      </span>
      {count > 0 ? (
        <span
          className={cn(
            "ml-auto inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5",
            "text-overline font-semibold text-accent-fg tabular",
            !forceLabel && "md:hidden lg:inline-flex",
          )}
        >
          {count}
          <span className="sr-only"> new</span>
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ email, name }: { email: string; name: string | null }) {
  const [signingOut, setSigningOut] = React.useState(false);

  const router = useRouter();

  async function signOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    // refresh() after replace(): the session cookie just changed, so every
    // server component rendered under the old session has to be discarded.
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-foreground-muted lg:inline">
        {name ?? email}
      </span>
      <span
        aria-hidden="true"
        className="inline-flex size-9 items-center justify-center rounded-full bg-surface-sunken text-foreground-muted lg:hidden"
      >
        <User className="size-4" />
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground-muted",
          "hover:bg-surface-sunken hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:opacity-50",
        )}
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
        <span className="sr-only sm:hidden">Sign out</span>
      </button>
    </div>
  );
}
