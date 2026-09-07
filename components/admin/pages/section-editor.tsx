"use client";

import * as React from "react";
import { RotateCcw, Save } from "lucide-react";

import {
  resetPageSection,
  savePageSection,
} from "@/app/(admin)/admin/(shell)/pages/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

/**
 * One editable landing-page section (brief §35).
 *
 * ── Why fields are generated from the value ───────────────────────────────
 *
 * Eleven sections with different shapes could mean eleven bespoke forms. They
 * do not, because the shapes are made of four things: a string, a list of
 * strings, a link, and a list of objects. Walking the default value and
 * rendering the right control for each is one component instead of eleven that
 * drift apart — and adding a field to `DEFAULT_CONTENT` gives it an editor for
 * free, which is what stops the two going out of step.
 *
 * ── Why long strings get a textarea and short ones an input ───────────────
 *
 * Judged by the length of the SHIPPED copy, not by the field name. A headline
 * is short and a body paragraph is not, and that is knowable without a schema
 * describing which is which.
 *
 * ── Reset deletes rather than restores ────────────────────────────────────
 *
 * The button says "Reset to original wording" and removes the row, so the page
 * falls back to the copy in code. Writing the defaults into the row instead
 * would freeze today's wording forever, and a later improvement would never
 * reach anyone who had pressed save.
 */

type Value = unknown;

export function SectionEditor({
  pageSlug,
  sectionKey,
  label,
  description,
  defaults,
  stored,
  enabled,
}: {
  pageSlug: string;
  sectionKey: string;
  label: string;
  description: string;
  /** The shipped copy. Defines the shape and the placeholders. */
  defaults: Record<string, Value>;
  /** What is stored, if anything. */
  stored: Record<string, Value> | null;
  enabled: boolean;
}) {
  const toast = useToast();
  const [value, setValue] = React.useState<Record<string, Value>>({
    ...defaults,
    ...(stored ?? {}),
  });
  const [on, setOn] = React.useState(enabled);
  const [busy, setBusy] = React.useState<string | null>(null);

  const set = (key: string, next: Value) =>
    setValue((current) => ({ ...current, [key]: next }));

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-h4 font-semibold">{label}</h3>
          <p className="max-w-[70ch] text-sm text-foreground-muted">{description}</p>
        </div>
        {stored ? (
          <span className="rounded-sm bg-accent-wash px-2 py-1 text-xs font-medium text-accent-quiet">
            Edited
          </span>
        ) : null}
      </div>

      <SwitchField
        label="Show this section on the page"
        description="Hides it. Nothing is deleted."
        checked={on}
        onCheckedChange={setOn}
      />

      {on
        ? Object.entries(defaults).map(([key, fallback]) => (
            <FieldFor
              key={key}
              name={key}
              fallback={fallback}
              value={value[key]}
              onChange={(next) => set(key, next)}
            />
          ))
        : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button
          type="button"
          loading={busy === "save"}
          onClick={async () => {
            setBusy("save");
            const result = await savePageSection({
              pageSlug,
              sectionKey,
              content: value,
              enabled: on,
            });
            setBusy(null);
            if (result.ok) toast.success(result.message);
            else toast.error(result.error);
          }}
        >
          <Save aria-hidden="true" />
          Save this section
        </Button>

        {stored ? (
          <Button
            type="button"
            variant="ghost"
            loading={busy === "reset"}
            onClick={async () => {
              setBusy("reset");
              const result = await resetPageSection(pageSlug, sectionKey);
              setBusy(null);
              if (result.ok) {
                toast.success(result.message);
                setValue(defaults);
              } else toast.error(result.error);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Reset to the original wording
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** A human label from a key: `primaryCta` → "Primary cta". */
function humanise(name: string): string {
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The right control for whatever this field holds.
 *
 * Lists of objects are edited as JSON, deliberately. A services list is five
 * objects each with a title, a description and a list of points; a bespoke
 * repeater for it would be a real piece of work, and JSON — with the shipped
 * value already in the box as a worked example — is honest about what is being
 * edited rather than pretending a structure is simpler than it is.
 */
function FieldFor({
  name,
  fallback,
  value,
  onChange,
}: {
  name: string;
  fallback: Value;
  value: Value;
  onChange: (next: Value) => void;
}) {
  const label = humanise(name);

  if (typeof fallback === "string") {
    const long = fallback.length > 90;
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        {long ? (
          <Textarea
            rows={3}
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Input
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
    );
  }

  // A list of plain strings: paragraphs, service areas. One per line.
  if (Array.isArray(fallback) && fallback.every((v) => typeof v === "string")) {
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <Textarea
          rows={Math.min(8, Math.max(3, fallback.length + 1))}
          value={(Array.isArray(value) ? (value as string[]) : []).join("\n\n")}
          onChange={(event) =>
            onChange(
              event.target.value
                .split(/\n{2,}/)
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
        <FieldDescription>
          One paragraph per block, blank line between.</FieldDescription>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        rows={Array.isArray(fallback) ? 12 : 5}
        className="font-mono text-sm"
        value={JSON.stringify(value ?? fallback, null, 2)}
        onChange={(event) => {
          try {
            onChange(JSON.parse(event.target.value));
          } catch {
            /*
              Half-typed JSON is invalid JSON, and rejecting every keystroke
              until it parses would make the box unusable. The last valid value
              is kept; an unparseable box simply does not update the value, and
              Save writes what was last valid.
            */
          }
        }}
      />
      <FieldDescription>
        Keep the shape, change the words.</FieldDescription>
    </Field>
  );
}
