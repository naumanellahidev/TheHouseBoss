import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/date";
import type { EngineKeyword, EngineRun } from "@/lib/queries/platform";

/**
 * What the SEO engine produced for this listing, and why (brief §85, §90, §92).
 *
 * ── Why the evidence is shown beside every keyword ────────────────────────
 *
 * §85 asks for "why did AI recommend this" to be answerable. It could have been
 * a tooltip or a separate history screen. It is inline because the question is
 * only ever asked while looking at a keyword that seems wrong — and an
 * explanation you have to go and find is one nobody reads before deciding the
 * feature is untrustworthy.
 *
 * The sentences are not generated for display. They are the reasons the engine
 * recorded when it made each decision: the geo graph's own words for a place,
 * the record's own attribute for a feature. A separately-written justification
 * would be a plausible story about a decision rather than the decision.
 *
 * ── Why this is read-only for now ─────────────────────────────────────────
 *
 * `pinned` and `excluded` exist in the schema and are honoured by the engine —
 * a regeneration never overwrites them. The controls that SET them are not
 * built yet, and showing a switch that does nothing would be worse than showing
 * the state plainly. The column is rendered so the contract is visible.
 */

const KIND_LABEL: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  long_tail: "Long tail",
  feature: "Feature",
  intent: "Buyer intent",
  nearby: "Nearby",
  regional: "Regional",
};

export function KeywordPanel({
  keywords,
  runs,
}: {
  keywords: EngineKeyword[];
  runs: EngineRun[];
}) {
  if (keywords.length === 0 && runs.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-sunken p-5">
        <p className="text-sm font-medium text-foreground">
          No keywords yet
        </p>
        <p className="max-w-[70ch] text-sm text-foreground-muted">
          They are worked out from this listing&rsquo;s own details and the
          places genuinely near it, the moment you publish. Nothing is invented:
          a listing with no pool recorded never gets a pool keyword.
        </p>
      </div>
    );
  }

  const shown = keywords.filter((k) => !k.excluded);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-h4 font-semibold">
            Search phrases this listing targets
          </h3>
          <span className="text-sm text-foreground-muted">
            <span className="tabular font-semibold text-foreground">{shown.length}</span>{" "}
            {shown.length === 1 ? "phrase" : "phrases"}
          </span>
        </div>

        <p className="max-w-[70ch] text-sm text-foreground-muted">
          Each one is built from something this listing actually records and a
          place genuinely connected to it. The line underneath says what.
        </p>

        <ul className="flex flex-col gap-2">
          {shown.map((keyword) => (
            <li
              key={keyword.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-medium text-foreground">{keyword.keyword}</span>
                <Badge tone="neutral">{KIND_LABEL[keyword.kind] ?? keyword.kind}</Badge>
                {keyword.place ? (
                  <span className="text-xs text-foreground-subtle">{keyword.place}</span>
                ) : null}
                {keyword.pinned ? <Badge tone="active">Kept by you</Badge> : null}
              </div>
              <p className="max-w-[80ch] text-sm text-foreground-muted">
                {keyword.evidence}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {runs.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <h3 className="text-h4 font-semibold">History</h3>
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            Every time the phrases were worked out, and what happened.
          </p>

          <ul className="flex flex-col gap-2">
            {runs.slice(0, 5).map((run) => (
              <li
                key={run.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-surface px-4 py-3 text-sm"
              >
                <Sparkles className="size-4 text-accent-quiet" aria-hidden="true" />
                <span className="text-foreground-muted">
                  {formatDateTime(run.createdAt)}
                </span>
                <span className="text-foreground">
                  {run.status === "failed"
                    ? "Failed"
                    : `${run.keywordsStored} written`}
                  {run.keywordsRejected > 0
                    ? `, ${run.keywordsRejected} rejected as unsupported`
                    : ""}
                </span>
                <span className="text-xs text-foreground-subtle">
                  {run.trigger === "publish" ? "on publish" : run.trigger}
                </span>
                {/*
                  The engine version, not decoration. When copy written in March
                  reads worse than copy written in June, this is the column that
                  says whether the engine changed in between (§35).
                */}
                <span className="ml-auto text-xs text-foreground-subtle tabular">
                  v{run.engineVersion}
                </span>
                {run.error ? (
                  <span className="w-full text-xs text-danger">{run.error}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
