"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Toggle switch.
 *
 * A native `<button role="switch">` rather than another Radix package: the
 * whole contract is `aria-checked` plus Space/Enter, both of which a button
 * gives for free. The hit area is 44px tall even though the track is 24px —
 * the padding is part of the control, not decoration around it.
 *
 * Naming is the caller's job and is NOT optional. Either pass `id` and render a
 * <label htmlFor> beside it (SwitchField below does that), or pass `label` for
 * an aria-label when the switch sits in a table cell with no room for visible
 * text. A switch whose only content is a decorative span has no accessible name
 * at all — axe reports it as a critical `button-name` violation, which is
 * exactly how this was caught.
 */
export function Switch({
  checked,
  onCheckedChange,
  id,
  label,
  disabled,
  describedBy,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  /** Accessible name, when no visible <label> points at this control. */
  label?: string;
  disabled?: boolean;
  describedBy?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-11 w-14 shrink-0 items-center rounded-full px-1",
        "transition-colors duration-(--dur-fast) ease-(--ease-out)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {/* The track is a child so the button can be 44px tall while the visible
          switch stays 24px. */}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-6 w-12 items-center rounded-full border p-0.5",
          "transition-colors duration-(--dur-fast)",
          checked
            ? "border-accent bg-accent"
            : "border-border-strong bg-surface-sunken",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-surface shadow-sm",
            "transition-transform duration-(--dur-fast) ease-(--ease-out)",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

/** Switch + label + description in the layout used across the admin forms. */
export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-xs text-foreground-muted">
            {description}
          </p>
        ) : null}
      </div>

      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        describedBy={descriptionId}
      />
    </div>
  );
}
