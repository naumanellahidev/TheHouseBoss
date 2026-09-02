"use client";

import * as React from "react";
import type {
  Control,
  FieldPath,
  FieldValues,
  UseFormRegister,
} from "react-hook-form";
import { Controller } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * react-hook-form bindings for the existing field primitives.
 *
 * These add no styling of their own — <Field> already owns the label/error/
 * aria-describedby contract from docs/03 § 6. What they add is the one thing
 * that would otherwise be repeated forty times in the listing editor: reading
 * the error out of RHF's nested `formState.errors` and turning an empty string
 * into `null` so an optional numeric column is not written as 0.
 */

type Base<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  description?: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
};

export function TextField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  error,
  register,
  className,
  ...props
}: Base<T> & {
  register: UseFormRegister<T>;
} & Omit<React.ComponentProps<"input">, "name">) {
  return (
    <Field error={error} className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input {...register(name)} {...props} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

/**
 * A number input whose empty state is `null`, not `0` or `NaN`.
 *
 * "Year built: 0" and "Beds: 0" are different claims from "not recorded", and
 * the schema models the difference with nullable columns. valueAsNumber alone
 * produces NaN for an empty field, which zod then rejects with an unhelpful
 * message, so the coercion is done here.
 */
export function NumberField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  error,
  control,
  step,
  min,
  max,
  prefix,
  suffix,
  className,
  placeholder,
}: Base<T> & {
  control: Control<T>;
  step?: number | string;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <Field error={error} className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="relative">
            {prefix ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-foreground-subtle"
              >
                {prefix}
              </span>
            ) : null}
            <Input
              type="number"
              inputMode="decimal"
              step={step}
              min={min}
              max={max}
              placeholder={placeholder}
              className={cn(prefix && "pl-7", suffix && "pr-12")}
              value={field.value ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                field.onChange(raw === "" ? null : Number(raw));
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
            {suffix ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-foreground-subtle"
              >
                {suffix}
              </span>
            ) : null}
          </div>
        )}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  error,
  register,
  options,
  placeholder,
  className,
}: Base<T> & {
  register: UseFormRegister<T>;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Field error={error} className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Select {...register(name)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  error,
  register,
  rows = 5,
  maxLength,
  currentLength,
  className,
  placeholder,
}: Base<T> & {
  register: UseFormRegister<T>;
  rows?: number;
  maxLength?: number;
  /** When given, a live "104 / 155" counter is rendered under the control. */
  currentLength?: number;
  placeholder?: string;
}) {
  const over = maxLength != null && currentLength != null && currentLength > maxLength;

  return (
    <Field error={error} className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Textarea {...register(name)} rows={rows} placeholder={placeholder} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {description ? <FieldDescription>{description}</FieldDescription> : <span />}
        {maxLength != null && currentLength != null ? (
          <span
            className={cn(
              "text-xs tabular",
              over ? "font-semibold text-danger" : "text-foreground-subtle",
            )}
          >
            {currentLength} / {maxLength}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
