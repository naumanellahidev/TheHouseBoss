"use client";

import * as React from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Bell, Inbox, Star } from "lucide-react";

import { fetchNotifications } from "@/app/(admin)/admin/(shell)/notification-actions";
import type { AdminNotification, NotificationPriority } from "@/lib/queries/notifications";
import { shortAgo } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

/**
 * The notification bell.
 *
 * ── What it shows ─────────────────────────────────────────────────────────
 *
 * The work that is waiting, ranked. Not a log of things that have happened —
 * an item is here because somebody is waiting for a reply, and it leaves when
 * that is dealt with (`lib/queries/notifications.ts` explains why there is no
 * dismiss button).
 *
 * ── Why it polls ──────────────────────────────────────────────────────────
 *
 * Installed on a phone, the dashboard sits open on one screen for hours. A
 * count rendered at the last navigation is a count that is wrong by the time it
 * matters. It refreshes on open, and every ninety seconds while the tab is
 * actually visible — a backgrounded app polls nothing, which is what keeps this
 * from draining a phone that is in a pocket.
 *
 * ── Why the badge counts urgent separately ────────────────────────────────
 *
 * "12" tells her there is a pile. "2 urgent" tells her whether to stop what she
 * is doing. The badge turns red only for the second, so the colour means
 * something the number does not.
 */

const TONE: Record<
  NotificationPriority,
  { dot: string; label: string; chip: string }
> = {
  urgent: { dot: "bg-danger", label: "Urgent", chip: "bg-danger-bg text-danger" },
  high: { dot: "bg-warning", label: "Soon", chip: "bg-warning-bg text-warning" },
  normal: { dot: "bg-border-strong", label: "When you can", chip: "bg-surface-sunken text-foreground-muted" },
};

const ICON = { lead: Inbox, review: Star } as const;

export function NotificationBell({
  initial,
  floating,
  menuPanel,
}: {
  initial: AdminNotification[];
  /** The shell's pill styling, passed in so the chrome owns its own look. */
  floating: string;
  menuPanel: string;
}) {
  const [items, setItems] = React.useState(initial);
  const [open, setOpen] = React.useState(false);

  // The server render is the first value; after that this owns it.
  const refresh = React.useCallback(async () => {
    try {
      setItems(await fetchNotifications());
    } catch {
      // A failed poll keeps the list it already has. An empty bell because the
      // network blinked would read as "nothing waiting", which is the one wrong
      // answer this component can give.
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    const timer = window.setInterval(tick, 90_000);
    // A phone that was asleep wakes with a stale list; this is the moment it is
    // most likely to be wrong and the moment she is most likely to be looking.
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const urgent = items.filter((item) => item.priority === "urgent").length;
  const total = items.length;

  return (
    <Menu.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <Menu.Trigger
        className={cn(
          floating,
          "relative inline-flex size-11 items-center justify-center text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        aria-label={
          total === 0
            ? "Notifications, nothing waiting"
            : urgent > 0
              ? `Notifications, ${total} waiting, ${urgent} urgent`
              : `Notifications, ${total} waiting`
        }
      >
        <Bell className="size-5" aria-hidden="true" />
        {total > 0 ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1",
              "text-overline font-semibold tabular",
              urgent > 0 ? "bg-danger text-primary-fg" : "bg-accent text-accent-fg",
            )}
          >
            {total}
          </span>
        ) : null}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={10}
          className={cn(menuPanel, "flex w-[min(22rem,calc(100vw-2rem))] flex-col p-0")}
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
            <Menu.Label className="text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
              Waiting on you
            </Menu.Label>
            {urgent > 0 ? (
              <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                {urgent} urgent
              </span>
            ) : null}
          </div>

          {total === 0 ? (
            <p className="px-4 py-5 text-sm text-foreground-muted">
              Nothing waiting. New enquiries and reviews appear here the moment
              they arrive.
            </p>
          ) : (
            /*
              Scrolls at eight-ish items rather than growing to the viewport.
              On a phone a menu as tall as the screen covers the thing it is
              anchored to, and the list is ranked — what is past the fold is
              what matters least.
            */
            <ul className="max-h-[60vh] overflow-y-auto overscroll-contain">
              {items.map((item) => {
                const tone = TONE[item.priority];
                const Icon = ICON[item.kind];

                return (
                  <li key={item.id}>
                    <Menu.Item asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex gap-3 border-b border-border px-4 py-3 last:border-b-0",
                          "hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none",
                        )}
                      >
                        <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken">
                          <Icon className="size-4 text-foreground-muted" aria-hidden="true" />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface",
                              tone.dot,
                            )}
                          />
                          <span className="sr-only">{tone.label}: </span>
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {item.title}
                            </span>
                            <span className="shrink-0 text-xs text-foreground-subtle tabular">
                              {shortAgo(new Date(item.createdAt))}
                            </span>
                          </span>

                          <span className="line-clamp-2 text-sm text-foreground-muted">
                            {item.detail}
                          </span>

                          {item.reason ? (
                            <span
                              className={cn(
                                "mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                                tone.chip,
                              )}
                            >
                              {item.reason}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </Menu.Item>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
            <Menu.Item asChild>
              <Link
                href="/admin/leads?status=new"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-foreground-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                All enquiries
              </Link>
            </Menu.Item>
            <Menu.Item asChild>
              <Link
                href="/admin/reviews"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-foreground-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                All reviews
              </Link>
            </Menu.Item>
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
