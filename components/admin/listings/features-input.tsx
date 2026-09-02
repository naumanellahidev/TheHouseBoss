"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tag input for `listings.features`, with autocomplete over what she has
 * already used.
 *
 * The autocomplete is not a convenience — docs/06 § 4 Tab 2 calls it out
 * specifically. Without it the same feature gets typed as "Granite Counters",
 * "granite countertops" and "Granite counter tops", and the GIN index on
 * `features` stops being able to group anything.
 *
 * Keyboard contract: Enter or comma commits, Backspace on an empty field
 * removes the last tag, Down/Up walk the suggestions, Escape closes them.
 */
export function FeaturesInput({
  value,
  onChange,
  suggestions,
  id,
  max = 60,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  id?: string;
  max?: number;
}) {
  const [draft, setDraft] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const listId = React.useId();

  const matches = React.useMemo(() => {
    const term = draft.trim().toLowerCase();
    if (term.length === 0) return [];
    return suggestions
      .filter(
        (candidate) =>
          candidate.toLowerCase().includes(term) &&
          !value.some((existing) => existing.toLowerCase() === candidate.toLowerCase()),
      )
      .slice(0, 6);
  }, [draft, suggestions, value]);

  function add(raw: string) {
    const feature = raw.trim().replace(/\s+/g, " ");
    if (!feature) return;
    if (value.length >= max) return;
    if (value.some((existing) => existing.toLowerCase() === feature.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, feature.slice(0, 60)]);
    setDraft("");
    setOpen(false);
    setHighlight(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(matches[highlight] && open ? matches[highlight]! : draft);
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
      return;
    }
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (current + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setHighlight((current) => (current - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((feature, index) => (
            <li key={`${feature}-${index}`}>
              <span className="inline-flex items-center gap-1 rounded-sm bg-accent-wash py-1 pr-1 pl-2.5 text-sm font-medium text-foreground">
                {feature}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label={`Remove ${feature}`}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-sm text-foreground-muted",
                    "hover:bg-surface hover:text-foreground",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  )}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <input
          id={id}
          value={draft}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={
            value.length >= max ? "Feature list is full" : "Type a feature, then Enter"
          }
          disabled={value.length >= max}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          className={cn(
            "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
            "placeholder:text-foreground-subtle",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60",
          )}
        />

        {open && matches.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
          >
            {matches.map((match, index) => (
              <li key={match}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(match)}
                  className={cn(
                    "flex min-h-11 w-full items-center px-3 text-left text-sm",
                    index === highlight
                      ? "bg-accent-wash text-foreground"
                      : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
                  )}
                >
                  {match}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
