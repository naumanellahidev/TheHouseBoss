"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Centred modal dialog. Radix gives focus trapping, Escape, body scroll lock,
 * focus restoration to the trigger, and the aria wiring.
 *
 * <Sheet /> is the edge-anchored panel; this is the centred one. They are
 * separate because their layout, motion and default width differ enough that
 * one component with a `variant` prop would be harder to read than two.
 *
 * Elevation: modal sits at the top rung of the ladder (docs/03 § 8) — shadow-xl,
 * never skipped from a card's shadow-sm.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-xs" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "max-h-[92svh] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl",
          "focus:outline-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-h4 font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-foreground-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className={cn(
              "-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md",
              "text-foreground-muted transition-colors duration-(--dur-fast)",
              "hover:bg-surface-sunken hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Right-aligned action row. Cancel first, the confirming action last. */
export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
