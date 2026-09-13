"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  Settings,
} from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  isActiveAdminRoute,
  visibleAdminNav,
  type AdminNavItem,
} from "@/lib/admin-nav";
import type { Permission } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/types/domain";

/**
 * Admin chrome — docs/06 § 2.
 *
 *   >=1280px  floating pills: logo · nav tray · storage · Settings · alerts · account
 *   <1280px   logo · storage · alerts · account · a menu button opening a bottom sheet
 *
 * 1280, not 1024: measured at 1024 the seven-pill tray ran under the logo on
 * the left and under the storage chip on the right, with "SEO" hidden behind it.
 *
 * The look comes from the client's reference dashboard: a light canvas with a
 * soft glow, pills rather than a sidebar, and the current section as a solid
 * navy pill. The glass is on the nav tray only — short labels — because body
 * text on glass is outside the contrast guard's reach (docs/03 § 3).
 *
 * Client component because it needs the current pathname and the menu state.
 * Everything it renders is passed in as props from the server layout, so no
 * data fetching crosses this boundary.
 */

export type AdminShellProps = {
  /**
   * Live branding, so the bar shows the logo the client uploaded.
   * Null only if the settings read failed — `Logo` then renders the type-set
   * lockup rather than nothing.
   */
  settings: SiteSettings | null;
  children: React.ReactNode;
  newLeads: number;
  /** Reviews a visitor submitted that nobody has published or discarded. */
  pendingReviews: number;
  userEmail: string;
  userName: string | null;
  /** The full storage meter, rendered in the mobile sheet; the server builds it. */
  storage: React.ReactNode;
  /** Drives the compact storage chip in the bar. */
  storagePercent: number;
  storageBar: string;
  /**
   * The signed-in user's grants. Resolved on the server and passed down, so
   * this component makes no authorization decision of its own — it only chooses
   * what to draw.
   */
  permissions: readonly Permission[];
};

/* ── Shared pill styles ──────────────────────────────────────────────────── */

const pill = cn(
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap",
  "transition-colors duration-(--dur-fast) ease-(--ease-out)",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const pillTone = (active: boolean) =>
  active
    ? "bg-primary text-primary-fg"
    : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground data-[state=open]:bg-surface-sunken data-[state=open]:text-foreground";

/** A standalone floating pill: logo, storage, Settings, alerts, account. */
const floating = "glass rounded-full border-(--color-glass-border) shadow-sm";

const menuPanel = cn(
  "z-50 min-w-56 rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-lg",
  "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in",
);

const menuItem = cn(
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground outline-none select-none",
  "data-[highlighted]:bg-surface-sunken",
);

export function AdminShell({
  children,
  settings,
  newLeads,
  pendingReviews,
  userEmail,
  userName,
  storage,
  storagePercent,
  storageBar,
  permissions,
}: AdminShellProps) {
  const pathname = usePathname();

  /*
    Hiding an item the user cannot use is a courtesy, not a security control.
    The route checks the permission itself and RLS refuses the rows regardless;
    this only stops the navigation offering a door that will not open.
  */
  const nav = React.useMemo(() => visibleAdminNav(permissions), [permissions]);
  const main = nav.filter((item) => item.section === "main");
  const content = nav.filter((item) => item.section === "content");
  const system = nav.filter((item) => item.section === "system");

  // A route change must close the drawer, or navigating leaves it covering the
  // page it just navigated to. The route it was opened on is stored WITH the
  // open flag and the two are compared during render, so no effect and no
  // cascading re-render is needed to close it.
  const [drawer, setDrawer] = React.useState({ open: false, at: pathname });
  const drawerOpen = drawer.open && drawer.at === pathname;
  const setDrawerOpen = (open: boolean) => setDrawer({ open, at: pathname });

  const current = nav.find((item) => isActiveAdminRoute(pathname, item.href));
  const counts = { leads: newLeads, reviews: pendingReviews };

  // Content sits between Enquiries and Reviews in the bar.
  const beforeContent = main.filter((item) => ["/admin", "/admin/listings", "/admin/leads"].includes(item.href));
  const afterContent = main.filter((item) => !beforeContent.includes(item));

  return (
    <div className="admin-canvas flex min-h-dvh flex-col">
      {/* ── The bar ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-5 lg:px-6">
        <div className="mx-auto flex max-w-(--container-wide) items-center gap-2 lg:gap-3">
          <div className={cn(floating, "flex h-12 shrink-0 items-center px-3")}>
            <Logo href="/admin" variant="compact" settings={settings} />
          </div>

          <nav aria-label="Dashboard" className="hidden min-w-0 flex-1 justify-center xl:flex">
            <ul className={cn(floating, "flex items-center gap-0.5 p-1.5")}>
              {beforeContent.map((item) => (
                <li key={item.href}>
                  <NavPill item={item} pathname={pathname} count={badgeCount(item, counts)} />
                </li>
              ))}

              {content.length > 0 ? (
                <li>
                  <GroupMenu
                    label="Content"
                    items={content}
                    pathname={pathname}
                    trigger={(active) => (
                      <>
                        Content
                        <ChevronDown className="size-4" aria-hidden="true" />
                        <span className="sr-only">{active ? " (current section)" : ""}</span>
                      </>
                    )}
                  />
                </li>
              ) : null}

              {afterContent.map((item) => (
                <li key={item.href}>
                  <NavPill item={item} pathname={pathname} count={badgeCount(item, counts)} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-0">
            <StorageChip percent={storagePercent} bar={storageBar} />

            {system.length > 0 ? (
              <div className="hidden xl:block">
                <GroupMenu
                  label="Settings"
                  items={system}
                  pathname={pathname}
                  floatingTrigger
                  extra={
                    <Menu.Item asChild className={menuItem}>
                      <a href="/" target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4 text-foreground-subtle" aria-hidden="true" />
                        View site
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Menu.Item>
                  }
                  trigger={() => (
                    <>
                      <Settings className="size-4" aria-hidden="true" />
                      Settings
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </>
                  )}
                />
              </div>
            ) : null}

            <Alerts newLeads={newLeads} pendingReviews={pendingReviews} />
            <Account email={userEmail} name={userName} />

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger
                className={cn(
                  floating,
                  "inline-flex size-11 items-center justify-center text-foreground xl:hidden",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
                aria-label="Open dashboard menu"
              >
                <MenuIcon className="size-5" aria-hidden="true" />
              </SheetTrigger>

              <SheetContent side="bottom" title="Dashboard" description="Dashboard sections">
                <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto px-3 py-3">
                  <SheetGroup title="Main" items={main} pathname={pathname} counts={counts} />
                  <SheetGroup title="Content" items={content} pathname={pathname} counts={counts} />
                  <SheetGroup title="Settings" items={system} pathname={pathname} counts={counts} />
                </nav>
                <div className="border-t border-border px-5 py-4 safe-bottom">{storage}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-(--container-wide) min-w-0 flex-1 px-4 pt-6 pb-12 md:px-6 lg:px-8 lg:pt-8"
      >
        {/*
          The document's single h1. Visually hidden: the bar shows where she is
          with the solid pill, and each screen's visible title is its own h2.
        */}
        <h1 className="sr-only">{current?.label ?? "Dashboard"}</h1>
        {children}
      </main>
    </div>
  );
}

/**
 * The number on an item, or none.
 *
 * A function rather than a ternary at each call site: the bar and the mobile
 * sheet render the same items, and the first version of the reviews badge went
 * on only one of them because the ternary was copied and then edited in one
 * place.
 */
function badgeCount(item: AdminNavItem, counts: { leads: number; reviews: number }): number {
  if (item.badge === "leads") return counts.leads;
  if (item.badge === "reviews") return counts.reviews;
  return 0;
}

function CountBadge({ count, invert = false }: { count: number; invert?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-overline font-semibold tabular",
        invert ? "bg-surface text-primary" : "bg-accent text-accent-fg",
      )}
    >
      {count}
      <span className="sr-only"> new</span>
    </span>
  );
}

function NavPill({
  item,
  pathname,
  count,
}: {
  item: AdminNavItem;
  pathname: string;
  count: number;
}) {
  const active = isActiveAdminRoute(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(pill, "px-3 xl:px-4", pillTone(active))}
    >
      {item.label}
      <CountBadge count={count} invert={active} />
    </Link>
  );
}

/** A pill that opens a menu of sections: Content, Settings. */
function GroupMenu({
  label,
  items,
  pathname,
  trigger,
  extra,
  floatingTrigger = false,
}: {
  label: string;
  items: AdminNavItem[];
  pathname: string;
  trigger: (active: boolean) => React.ReactNode;
  extra?: React.ReactNode;
  floatingTrigger?: boolean;
}) {
  const active = items.some((item) => isActiveAdminRoute(pathname, item.href));

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={cn(
          pill,
          floatingTrigger && cn(floating, "h-11 px-4"),
          pillTone(active),
          floatingTrigger && !active && "text-foreground",
        )}
      >
        {trigger(active)}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={floatingTrigger ? "end" : "start"} sideOffset={10} className={menuPanel}>
          <Menu.Label className="px-3 pt-1.5 pb-1 text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
            {label}
          </Menu.Label>
          {items.map((item) => {
            const Icon = item.icon;
            const current = isActiveAdminRoute(pathname, item.href);
            return (
              <Menu.Item key={item.href} asChild className={cn(menuItem, current && "bg-accent-wash")}>
                <Link href={item.href} aria-current={current ? "page" : undefined}>
                  <Icon className={cn("size-4", current ? "text-accent-quiet" : "text-foreground-subtle")} aria-hidden="true" />
                  {item.label}
                </Link>
              </Menu.Item>
            );
          })}
          {extra ? (
            <>
              <Menu.Separator className="my-1 h-px bg-border" />
              {extra}
            </>
          ) : null}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * Storage, in her line of sight at every width (docs/06 § 2).
 *
 * A real progress bar and the percentage as visible text, so colour never
 * carries the state alone. The link's accessible name contains that visible
 * text (WCAG 2.5.3).
 */
function StorageChip({ percent, bar }: { percent: number; bar: string }) {
  return (
    <Link
      href="/admin/media"
      className={cn(
        floating,
        "inline-flex h-11 items-center gap-2 px-3.5 text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      <span className="sr-only">Storage used: </span>
      {/*
        No aria-hidden on this track. It once had one, which hid the
        progressbar inside it from assistive technology entirely — the admin
        suite's role query found one meter on the page instead of two.
      */}
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-sunken">
        <span
          className={cn("block h-full rounded-full", bar)}
          style={{ width: `${Math.max(percent, 4)}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage used: ${percent} percent`}
        />
      </span>
      <span className="text-xs font-semibold tabular">{percent}%</span>
    </Link>
  );
}

function Alerts({ newLeads, pendingReviews }: { newLeads: number; pendingReviews: number }) {
  const total = newLeads + pendingReviews;

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={cn(
          floating,
          "relative inline-flex size-11 items-center justify-center text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        aria-label={total > 0 ? `Notifications, ${total} waiting` : "Notifications"}
      >
        <Bell className="size-5" aria-hidden="true" />
        {total > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-overline font-semibold text-accent-fg tabular"
          >
            {total}
          </span>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={10} className={cn(menuPanel, "w-72")}>
          <Menu.Label className="px-3 pt-1.5 pb-1 text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
            Waiting on you
          </Menu.Label>
          {total === 0 ? (
            <p className="px-3 py-3 text-sm text-foreground-muted">Nothing waiting. New enquiries and reviews show up here.</p>
          ) : null}
          {newLeads > 0 ? (
            <Menu.Item asChild className={menuItem}>
              <Link href="/admin/leads?status=new">
                <CountBadge count={newLeads} />
                {newLeads === 1 ? "new enquiry" : "new enquiries"}
              </Link>
            </Menu.Item>
          ) : null}
          {pendingReviews > 0 ? (
            <Menu.Item asChild className={menuItem}>
              <Link href="/admin/reviews">
                <CountBadge count={pendingReviews} />
                {pendingReviews === 1 ? "review to approve" : "reviews to approve"}
              </Link>
            </Menu.Item>
          ) : null}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Account({ email, name }: { email: string; name: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);
  const display = name ?? email;
  const initials =
    (name ?? email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A";

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
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg shadow-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        aria-label={`Account: ${display}`}
      >
        <span aria-hidden="true">{initials}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={10} className={cn(menuPanel, "w-64")}>
          <div className="flex flex-col gap-0.5 px-3 pt-2 pb-2">
            <span className="truncate text-sm font-semibold text-foreground">{display}</span>
            {name ? <span className="truncate text-xs text-foreground-subtle">{email}</span> : null}
          </div>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item asChild className={menuItem}>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="size-4 text-foreground-subtle" aria-hidden="true" />
              View site
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Menu.Item>
          <Menu.Item
            className={menuItem}
            disabled={signingOut}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            <LogOut className="size-4 text-foreground-subtle" aria-hidden="true" />
            {signingOut ? "Signing out…" : "Sign out"}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

function SheetGroup({
  title,
  items,
  pathname,
  counts,
}: {
  title: string;
  items: AdminNavItem[];
  pathname: string;
  counts: { leads: number; reviews: number };
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-1 pb-3">
      <h2 className="flex items-center gap-2 px-2 pt-2 pb-1 text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
        {title === "Main" ? <LayoutGrid className="size-3.5" aria-hidden="true" /> : null}
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActiveAdminRoute(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-2.5 rounded-2xl px-3 text-sm font-semibold",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "bg-primary text-primary-fg"
                    : "bg-surface-sunken text-foreground hover:bg-accent-wash",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <CountBadge count={badgeCount(item, counts)} invert={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
