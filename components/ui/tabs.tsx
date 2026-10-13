"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * Tabs, on Radix — arrow-key roving focus, correct `aria-controls` wiring and
 * automatic activation for free.
 *
 * Drawn as a pill switcher (docs/06 § 2): the triggers sit in one rounded tray
 * and the selected one is a solid navy pill. Only the admin's editors use tabs,
 * so this is the admin's look.
 *
 * The selected state is carried by fill AND by contrast of the whole pill, not
 * by colour alone (docs/03 § 9), and Radix sets `aria-selected`.
 *
 * The listing editor uses tabs at >=768px and an accordion below (docs/06 § 4).
 * That switch is made by the editor, not here: a Radix Tabs list forced to wrap
 * on a 360px screen is unusable, and hiding the mechanism inside this primitive
 * would make the accordion path harder to reason about.
 *
 * The tray scrolls horizontally rather than wrapping, so a six-tab editor never
 * pushes the page sideways (docs/04 § 2).
 */

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "scroll-row w-fit max-w-full items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const own = React.useRef<HTMLButtonElement | null>(null);

  /*
    A tab that is selected on arrival is scrolled into the tray.

    The tray scrolls sideways on a phone, so a link that opens a later tab —
    Settings → Notifications from the app's first-run popup — showed the first
    three tabs and none of them selected. Only the tray scrolls: scrollIntoView
    would move the page as well.
  */
  React.useEffect(() => {
    const el = own.current;
    const tray = el?.parentElement;
    if (!el || !tray || el.dataset.state !== "active") return;
    const box = el.getBoundingClientRect();
    const view = tray.getBoundingClientRect();
    if (box.right > view.right || box.left < view.left) {
      tray.scrollLeft += box.left - view.left - (view.width - box.width) / 2;
    }
  }, []);

  return (
    <TabsPrimitive.Trigger
      ref={(node) => {
        own.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold",
        "text-foreground-muted transition-colors duration-(--dur-fast)",
        "hover:bg-surface-sunken hover:text-foreground",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-fg",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "pt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
}
