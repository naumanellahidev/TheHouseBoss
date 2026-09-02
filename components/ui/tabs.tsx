"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * Tabs, on Radix — arrow-key roving focus, correct `aria-controls` wiring and
 * automatic activation for free.
 *
 * The listing editor uses tabs at >=768px and an accordion below (docs/06 § 4).
 * That switch is made by the editor, not here: a Radix Tabs list forced to wrap
 * on a 360px screen is unusable, and hiding the mechanism inside this primitive
 * would make the accordion path harder to reason about.
 *
 * The trigger row scrolls horizontally rather than wrapping, so a six-tab
 * editor never pushes the page sideways (docs/04 § 2).
 */

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "scroll-row -mx-1 items-center gap-1 border-b border-border px-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm font-medium",
        "text-foreground-muted transition-colors duration-(--dur-fast)",
        "hover:text-foreground",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        // The active marker is a bar, not a colour change alone — colour is
        // never the only carrier of meaning (docs/03 § 9).
        "data-[state=active]:text-foreground",
        "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent",
        "data-[state=active]:after:bg-accent",
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
