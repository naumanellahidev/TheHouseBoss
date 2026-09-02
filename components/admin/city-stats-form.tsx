"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CityStatsInput } from "@/lib/validation/place";

/**
 * City market statistics — docs/06 § 6.
 *
 * "The stats form must be a **form**, not a JSON textarea. She will not
 * hand-edit JSON, and a malformed object breaks the city page."
 *
 * The "as of" date is not an optional extra. Every statistic on this site has
 * to display the date it was true (docs/14 § 1, rule 4), and the schema refuses
 * to save a figure without one — a median price with no date looks current
 * forever. The warning below says so before the save fails rather than after.
 */
export function CityStatsForm({
  value,
  onChange,
  error,
}: {
  value: CityStatsInput;
  onChange: (next: CityStatsInput) => void;
  error?: string;
}) {
  const hasFigure =
    value.medianPrice != null ||
    value.medianPricePerSqft != null ||
    value.avgDaysOnMarket != null ||
    value.population != null;

  const missingDate = hasFigure && !value.asOf;

  const controlClass = cn(
    "h-11 w-full rounded-md border bg-surface px-3 text-body text-foreground",
    "placeholder:text-foreground-subtle",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  const number = (key: keyof CityStatsInput) => ({
    value: (value[key] as number | undefined) ?? "",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({
        ...value,
        [key]: event.target.value === "" ? undefined : Number(event.target.value),
      }),
  });

  const text = (key: keyof CityStatsInput) => ({
    value: (value[key] as string | undefined) ?? "",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [key]: event.target.value || undefined }),
  });

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold text-foreground">
        Market statistics
      </legend>

      <p className="max-w-[70ch] text-xs text-foreground-muted">
        Leave anything you do not have a real figure for blank. An invented
        number is worse than a missing one — this is the section an AI assistant
        is most likely to quote back to someone.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Median sale price</span>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-foreground-subtle"
            >
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="465000"
              className={cn(controlClass, "border-border-strong pl-7")}
              {...number("medianPrice")}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Median price per sq ft</span>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-foreground-subtle"
            >
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="242"
              className={cn(controlClass, "border-border-strong pl-7")}
              {...number("medianPricePerSqft")}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            Average days on market
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="38"
            className={cn(controlClass, "border-border-strong")}
            {...number("avgDaysOnMarket")}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Population</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="17000"
            className={cn(controlClass, "border-border-strong")}
            {...number("population")}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">School district</span>
          <input
            placeholder="Seminole County Public Schools"
            className={cn(controlClass, "border-border-strong")}
            {...text("schoolDistrict")}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            Commute to downtown Orlando
          </span>
          <input
            placeholder="About 30 minutes on I-4 outside peak"
            className={cn(controlClass, "border-border-strong")}
            {...text("commuteToOrlando")}
          />
        </label>
      </div>

      <label className="flex max-w-xs flex-col gap-1.5">
        <span className="flex items-baseline gap-2 text-xs font-semibold text-foreground">
          These figures are as of
          {hasFigure ? (
            <span className="font-medium text-foreground-subtle">Required</span>
          ) : null}
        </span>
        <input
          type="date"
          className={cn(
            controlClass,
            missingDate || error ? "border-danger" : "border-border-strong",
          )}
          {...text("asOf")}
        />
      </label>

      {missingDate || error ? (
        <p
          role="alert"
          className="flex max-w-[70ch] items-start gap-2 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            {error ??
              "Add the date these figures were true. Every statistic on the site is shown with its date — one without a date looks current forever, long after it stops being."}
          </span>
        </p>
      ) : null}
    </fieldset>
  );
}
