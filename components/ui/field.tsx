"use client";

import * as React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form field primitives.
 *
 * Rules from docs/03-design-system.md § 6:
 *  - the label is always visible above the control; never placeholder-as-label
 *  - required is marked with the word "Required", not a bare asterisk
 *  - errors are linked with aria-describedby and set aria-invalid
 *  - controls are 44px tall and never below 16px font size (iOS zoom)
 */

type FieldContextValue = {
  id: string;
  descriptionId: string;
  errorId: string;
  hasError: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("Field subcomponents must be used inside <Field>");
  return ctx;
}

export function Field({
  children,
  error,
  className,
  id: idProp,
}: {
  children: React.ReactNode;
  error?: string;
  className?: string;
  id?: string;
}) {
  const reactId = React.useId();
  const id = idProp ?? reactId;
  const value = React.useMemo(
    () => ({
      id,
      descriptionId: `${id}-description`,
      errorId: `${id}-error`,
      hasError: Boolean(error),
    }),
    [id, error],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("flex flex-col gap-2", className)}>
        {children}
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({
  children,
  required,
  className,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  const { id } = useField();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-baseline gap-2 text-sm font-semibold text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-xs font-medium text-foreground-subtle">
          Required
        </span>
      ) : null}
    </label>
  );
}

export function FieldDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { descriptionId } = useField();
  return (
    <p
      id={descriptionId}
      className={cn("text-xs text-foreground-subtle", className)}
    >
      {children}
    </p>
  );
}

export function FieldError({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { errorId } = useField();
  return (
    <p
      id={errorId}
      className={cn(
        "flex items-start gap-1.5 text-xs font-medium text-danger",
        className,
      )}
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const controlBase = [
  "w-full rounded-md border bg-surface px-3",
  "text-body text-foreground placeholder:text-foreground-subtle",
  "transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-out)",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60",
].join(" ");

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  const { id, descriptionId, errorId, hasError } = useField();
  return (
    <input
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : descriptionId}
      className={cn(
        controlBase,
        "h-11",
        hasError ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  const { id, descriptionId, errorId, hasError } = useField();
  return (
    <textarea
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : descriptionId}
      className={cn(
        controlBase,
        "min-h-28 py-2.5 leading-relaxed",
        hasError ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  const { id, descriptionId, errorId, hasError } = useField();
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : descriptionId}
        className={cn(
          controlBase,
          "h-11 appearance-none pr-10",
          hasError ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {/* Rendered as an element rather than a background data URI so it
          inherits the token color and needs no escaping. */}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground-muted"
      />
    </div>
  );
}

/** Honeypot: hidden from users AND from assistive tech. See docs/09 § 5. */
export function Honeypot({ name = "company" }: { name?: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
    >
      <label htmlFor={`hp-${name}`}>Leave this field empty</label>
      <input
        id={`hp-${name}`}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
