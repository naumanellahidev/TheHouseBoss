import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * docs/03-design-system.md § 6.
 * Sizes: sm 36 / md 44 / lg 52. md is the default and the touch-safe minimum.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-semibold tracking-[0.01em]",
    "transition-[background-color,box-shadow,transform,color]",
    "duration-(--dur-fast) ease-(--ease-out)",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-[1.125em] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg shadow-xs hover:bg-primary-hover active:translate-y-px",
        accent:
          "bg-accent text-accent-fg shadow-xs hover:bg-accent-hover active:translate-y-px",
        outline:
          "border border-border-strong bg-transparent text-primary hover:bg-surface-sunken active:translate-y-px",
        ghost:
          "bg-transparent text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
        danger:
          "bg-danger text-white shadow-xs hover:brightness-110 active:translate-y-px",
        invert:
          "bg-surface text-primary shadow-xs hover:bg-bone-100 active:translate-y-px",
        link: "bg-transparent text-accent-quiet underline underline-offset-4 hover:text-foreground",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-sm",
        icon: "size-11",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Replaces the label with a spinner. Width is preserved, so nothing reflows. */
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  loadingLabel = "Working…",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  if (asChild) {
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Label stays in flow while loading so the button width never changes. */}
      <span
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inline-flex items-center gap-2">
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span className="sr-only">{loadingLabel}</span>
        </span>
      )}
    </button>
  );
}

export { buttonVariants };
