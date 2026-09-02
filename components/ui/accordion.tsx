"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-start justify-between gap-4 py-5 text-left",
          "min-h-11 text-h4 font-semibold text-foreground",
          "transition-colors duration-(--dur-fast) ease-(--ease-out)",
          "hover:text-accent-quiet",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className,
        )}
        {...props}
      >
        <span className="text-pretty">{children}</span>
        <Plus
          aria-hidden="true"
          className={cn(
            "mt-1 size-5 shrink-0 text-accent-quiet",
            "transition-transform duration-(--dur-base) ease-(--ease-out)",
            "group-data-[state=open]:rotate-45",
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-none"
      {...props}
    >
      <div className={cn("max-w-[68ch] pb-6 text-foreground-muted", className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}
