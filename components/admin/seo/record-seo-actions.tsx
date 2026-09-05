"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, RefreshCw } from "lucide-react";

import {
  fillMissingAltText,
  regenerateListingSeo,
} from "@/app/(admin)/admin/(shell)/seo/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * The per-record SEO controls (brief §92).
 *
 * ── Why they sit beside the output rather than in the form ────────────────
 *
 * §92 asks every record for Regenerate SEO, Analyze SEO and View SEO History.
 * The history is the panel these buttons sit above, and "analyse" and
 * "regenerate" are the same operation here — the engine is deterministic, so
 * there is nothing to analyse that running it would not tell you, and offering
 * two buttons that do the same thing would only make an operator wonder which
 * one they wanted.
 *
 * ── Why the alt-text button says what it does not know ────────────────────
 *
 * Its label is "Describe the photos" and its toast says nothing has looked at
 * the images. A button labelled "AI alt text" would imply a vision model that
 * is not configured, and the resulting descriptions would be trusted more than
 * they deserve — by the operator, and therefore by the blind visitor relying on
 * them.
 */
export function RecordSeoActions({
  listingId,
  photosMissingAlt,
}: {
  listingId: string;
  /** How many photographs have no description. Zero hides that button. */
  photosMissingAlt: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(key: string, work: () => Promise<{ ok: boolean } & Record<string, unknown>>) {
    setBusy(key);
    const result = await work();
    setBusy(null);
    if (result.ok) {
      toast.success(String(result.message ?? "Done."));
      router.refresh();
    } else {
      toast.error(String(result.error ?? "That did not work."));
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant="outline"
        loading={busy === "regen"}
        onClick={() => run("regen", () => regenerateListingSeo(listingId))}
      >
        <RefreshCw aria-hidden="true" />
        Work out the search phrases again
      </Button>

      {photosMissingAlt > 0 ? (
        <Button
          type="button"
          variant="outline"
          loading={busy === "alt"}
          onClick={() => run("alt", () => fillMissingAltText(listingId))}
        >
          <ImageIcon aria-hidden="true" />
          Describe {photosMissingAlt}{" "}
          {photosMissingAlt === 1 ? "photo" : "photos"} without descriptions
        </Button>
      ) : null}
    </div>
  );
}
