"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel, Input } from "@/components/ui/field";

/**
 * Confirmation with real friction — admin UX rule 3 (docs/06 § 11).
 *
 * Delete requires typing the entity's address or title, not clicking "Yes".
 * The confirmation phrase is compared case-insensitively and trimmed, because
 * the point is deliberation, not a spelling test.
 *
 * `consequence` is where the caller states what is actually lost — "12 photos,
 * about 2.5 MB of storage" — so the decision is made with the facts visible.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequence,
  confirmPhrase,
  confirmLabel = "Delete",
  confirmHint,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  consequence?: React.ReactNode;
  /** The exact text the user must type. */
  confirmPhrase: string;
  confirmLabel?: string;
  confirmHint?: string;
  onConfirm: (typed: string) => Promise<void> | void;
}) {
  const [typed, setTyped] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Reset between openings, or a second delete inherits the first one's text.
  // Adjusted during render rather than in an effect: this is state derived from
  // a prop changing, and an effect here would render the stale value once first.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setTyped("");
      setPending(false);
    }
  }

  const matches =
    typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {consequence ? (
          <div className="mb-5 rounded-md border border-danger/30 bg-danger-bg p-4 text-sm text-foreground">
            {consequence}
          </div>
        ) : null}

        <Field>
          <FieldLabel required>
            Type <span className="font-mono">{confirmPhrase}</span> to confirm
          </FieldLabel>
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            // Not autoFocus: focus lands on the dialog, and jumping straight
            // into the confirmation field encourages typing before reading.
          />
          {confirmHint ? <FieldDescription>{confirmHint}</FieldDescription> : null}
        </Field>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!matches}
            loading={pending}
            onClick={async () => {
              setPending(true);
              await onConfirm(typed);
              setPending(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
