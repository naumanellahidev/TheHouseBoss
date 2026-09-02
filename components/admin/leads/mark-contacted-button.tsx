"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { setLeadStatus } from "@/app/(admin)/admin/(shell)/leads/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * One-click "Mark contacted" on the dashboard's recent-leads list (docs/06 § 3).
 *
 * Optimistic, with rollback (admin UX rule 6): the row disappears from the
 * "new" state immediately, and a rejected write puts the button back with a
 * toast carrying a retry. An optimistic save that fails silently is worse than
 * a slow one, so the failure path is the one written first.
 */
export function MarkContactedButton({ leadId }: { leadId: string }) {
  const toast = useToast();
  const [done, setDone] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // A function declaration, not useCallback: the retry action in the toast has
  // to call this same function, and a useCallback cannot reference itself
  // inside its own initialiser.
  function run() {
    setDone(true);
    startTransition(async () => {
      const result = await setLeadStatus({ id: leadId, status: "contacted" });
      if (!result.ok) {
        setDone(false);
        toast.error(result.error, { label: "Try again", onClick: run });
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-success">
        <Check className="size-4" aria-hidden="true" />
        Marked contacted
      </span>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={run} loading={pending}>
      Mark contacted
    </Button>
  );
}
