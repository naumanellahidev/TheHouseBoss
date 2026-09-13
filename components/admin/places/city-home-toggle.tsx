"use client";

import * as React from "react";

import { setCityOnHome } from "@/app/(admin)/admin/(shell)/content-actions";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

/**
 * Show or hide one city on the home page, from the cities list.
 *
 * Optimistic, because the answer is obvious and the wait is not: the switch
 * moves on click and only moves back if the server refuses. A spinner on a
 * two-state control tells the operator nothing they cannot already see.
 *
 * The label is a real one — "On the home page" — rather than a bare switch
 * with a tooltip: a screen reader user gets the same sentence a sighted one
 * reads, and it says what the switch does rather than what it is.
 */
export function CityHomeToggle({
  id,
  name,
  showOnHome,
}: {
  id: string;
  name: string;
  showOnHome: boolean;
}) {
  const toast = useToast();
  const [on, setOn] = React.useState(showOnHome);
  const [saving, setSaving] = React.useState(false);

  async function change(next: boolean) {
    const previous = on;
    setOn(next);
    setSaving(true);

    const result = await setCityOnHome(id, next);
    setSaving(false);

    if (!result.ok) {
      setOn(previous);
      toast.error(result.error);
      return;
    }
    toast.success(
      next
        ? `${name} now appears on the home page.`
        : `${name} hidden from the home page.`,
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <Switch
        checked={on}
        onCheckedChange={(next) => void change(next)}
        disabled={saving}
        label={`Show ${name} on the home page`}
      />
      <span className="text-xs font-medium text-foreground-muted">
        On the home page
      </span>
    </div>
  );
}
