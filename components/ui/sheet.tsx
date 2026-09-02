"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Full-screen / edge-anchored panel built on Radix Dialog, which gives us focus
 * trapping, Escape to close, body scroll lock and correct aria wiring for free
 * (docs/04-responsive-spec.md § 3).
 */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  title,
  description,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "right" | "bottom";
  /** Required for accessibility. Pass srOnlyTitle to hide it visually. */
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-xs",
          "data-[state=open]:animate-in data-[state=open]:fade-in",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface-invert text-foreground-invert shadow-xl",
          "focus:outline-none",
          side === "right" && "inset-y-0 right-0 w-full max-w-sm sm:max-w-md",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[92svh] rounded-t-xl bg-surface text-foreground",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border-invert px-5 py-4">
          <DialogPrimitive.Title
            className={cn(
              "text-h4 font-semibold",
              side === "bottom" && "text-foreground",
            )}
          >
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close"
            className={cn(
              "-mr-2 inline-flex size-11 items-center justify-center rounded-md",
              "transition-colors duration-(--dur-fast)",
              side === "right"
                ? "text-foreground-invert-muted hover:bg-ink-800 hover:text-foreground-invert"
                : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
            )}
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        {description ? (
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
        ) : null}

        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
