"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/types/domain";

/**
 * FAQ repeater — docs/06 § 6, and rule 5: no JSON textareas.
 *
 * What this list produces is rendered twice on the public page: once as the
 * visible accordion and once as `FAQPage` structured data, from the SAME array
 * (docs/08 § 6). That is why it is a real form. A hand-edited JSON blob with a
 * trailing comma takes out the markup and the accordion together.
 *
 * Reorder is by button, not drag: drag-and-drop is not keyboard operable, and
 * these screens hold to WCAG 2.1 AA like the public ones.
 */
export function FaqRepeater({
  value,
  onChange,
  description,
}: {
  value: FaqItem[];
  onChange: (next: FaqItem[]) => void;
  description?: string;
}) {
  function update(index: number, patch: Partial<FaqItem>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  }

  const controlClass = cn(
    "w-full rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
    "placeholder:text-foreground-subtle",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold text-foreground">
        Frequently asked questions
      </legend>

      <p className="max-w-[70ch] text-xs text-foreground-muted">
        {description ??
          "These appear as an accordion on the page and are also published as structured data, so search engines and AI assistants can quote the answer directly. Write the question the way someone would actually ask it."}
      </p>

      {value.length > 0 ? (
        <ol className="flex flex-col gap-4">
          {value.map((item, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                  Question {index + 1}
                </span>

                <div className="ml-auto flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move question ${index + 1} up`}
                  >
                    <ChevronUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move question ${index + 1} down`}
                  >
                    <ChevronDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-bg hover:text-danger"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground">Question</span>
                <input
                  value={item.q}
                  onChange={(event) => update(index, { q: event.target.value })}
                  placeholder="Is Lake Mary a good place to buy right now?"
                  className={cn(controlClass, "h-11")}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground">Answer</span>
                <textarea
                  value={item.a}
                  onChange={(event) => update(index, { a: event.target.value })}
                  rows={3}
                  placeholder="Answer it directly in the first sentence, then explain."
                  className={cn(controlClass, "min-h-24 py-2.5 leading-relaxed")}
                />
              </label>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface-sunken p-4 text-sm text-foreground-muted">
          No questions yet. Three or four real ones are worth more than ten
          invented ones.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...value, { q: "", a: "" }])}
      >
        <Plus aria-hidden="true" />
        Add a question
      </Button>
    </fieldset>
  );
}
