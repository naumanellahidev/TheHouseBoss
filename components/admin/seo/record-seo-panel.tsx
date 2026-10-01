"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, Check, Info, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SeoAudit, SeoCheck } from "@/lib/seo/auto/score";
import { scoreLabel } from "@/lib/seo/auto/score";
import { cn } from "@/lib/utils";

/**
 * The SEO tab, for a listing and for an article.
 *
 * ── What it replaced ──────────────────────────────────────────────────────
 *
 * Two text fields, two character counters and a preview of the two text fields.
 * Everything it showed was something the operator had just typed, so the only
 * question it could answer was "is this too long" — and the questions that
 * decide whether the page is found were not asked at all: whether the article
 * opens with the answer, whether the photographs are described, whether the page
 * links anywhere, whether the structured data has enough to publish.
 *
 * Now the audit (`lib/seo/auto/score.ts`) asks all of them and this renders the
 * result: what is wrong, in a sentence, with a button that goes to the tab where
 * it is fixed.
 *
 * ── Why the score is small ────────────────────────────────────────────────
 *
 * Deliberately. A number is a good way to notice a problem and a terrible way to
 * understand one, and a big number invites working on the number. The failures
 * are the content of this panel; the dial is a summary of them.
 *
 * ── Why the fields are passed in ──────────────────────────────────────────
 *
 * The listing form and the article form validate against different zod schemas,
 * so their `register` is a different type. Rather than making this component
 * generic over both — which is a lot of type machinery to render two inputs —
 * each form passes its own fields as children. The layout, the audit and the
 * previews are shared; the form wiring stays in the form.
 */

const TONE: Record<
  SeoCheck["status"],
  { icon: typeof Check; text: string; bg: string; ring: string; label: string }
> = {
  fail: {
    icon: AlertTriangle,
    text: "text-danger",
    bg: "bg-danger-bg",
    ring: "text-danger",
    label: "Needs fixing",
  },
  warn: {
    icon: Info,
    text: "text-warning",
    bg: "bg-warning-bg",
    ring: "text-warning",
    label: "Worth doing",
  },
  pass: {
    icon: Check,
    text: "text-success",
    bg: "bg-success-bg",
    ring: "text-success",
    label: "Done",
  },
};

/**
 * The score, as a ring.
 *
 * Rendered as an SVG rather than a progress element because the value is a
 * summary of a list that is right there underneath it — so it carries an
 * `aria-hidden` and the accessible name lives on the text beside it. A
 * `progressbar` role would announce "74 per cent" with no indication of what of.
 */
function ScoreDial({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const tone = score >= 90 ? "text-success" : score >= 55 ? "text-warning" : "text-danger";

  return (
    <svg viewBox="0 0 80 80" className="size-24 shrink-0" aria-hidden="true">
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        strokeWidth="7"
        className="text-border"
        stroke="currentColor"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={`${dash} ${circumference}`}
        // Twelve o'clock, not three.
        transform="rotate(-90 40 40)"
        className={tone}
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        className={cn("font-display text-h4 tabular", tone)}
        fill="currentColor"
      >
        {score}
      </text>
    </svg>
  );
}

function CheckRow({
  check,
  onGoToTab,
  currentTab,
}: {
  check: SeoCheck;
  onGoToTab?: (tab: string) => void;
  currentTab?: string;
}) {
  const tone = TONE[check.status];
  const Icon = tone.icon;
  const canJump = Boolean(check.tab && onGoToTab && check.tab !== currentTab);

  return (
    <li className="flex gap-3 border-b border-border py-3 last:border-b-0">
      <span
        className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tone.bg)}
      >
        <Icon className={cn("size-3.5", tone.text)} aria-hidden="true" />
        <span className="sr-only">{tone.label}:</span>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">{check.label}</p>
        <p className="text-sm text-foreground-muted">{check.detail}</p>
      </div>

      {canJump ? (
        <button
          type="button"
          onClick={() => onGoToTab?.(check.tab as string)}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1 self-start rounded-full px-3 text-sm font-semibold",
            "text-accent-quiet hover:bg-accent-wash",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          )}
        >
          Fix
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

export type RecordPreview = {
  /** Displayed breadcrumb, e.g. "thehousebossfl.com › listing › 1428-bridgewater". */
  crumb: string;
  title: string;
  description: string;
  /**
   * The sentence an assistant would lift.
   *
   * On an article that is the answer-first block; on a listing it is the
   * contractor's read, because that is the part of a listing page that says
   * something no other source about the property says.
   */
  quote?: string | null;
  quoteLabel?: string;
};

export function RecordSeoPanel({
  audit,
  preview,
  currentTab = "seo",
  onGoToTab,
  generate,
  children,
}: {
  audit: SeoAudit;
  preview: RecordPreview;
  currentTab?: string;
  onGoToTab?: (tab: string) => void;
  generate?: { onClick: () => void; busy: boolean; note?: string };
  /** The form's own meta title and description fields. */
  children: React.ReactNode;
}) {
  const open = audit.checks.filter((c) => c.status !== "pass");
  const passing = audit.checks.filter((c) => c.status === "pass");

  return (
    <div className="flex flex-col gap-5">
      {/*
        ── Score and the one button ─────────────────────────────────────

        The masthead of the panel, and deliberately the largest thing in it. The
        number is what somebody looks at first and the status word is what they
        remember, so the word is a pill rather than part of a sentence — at a
        glance across the screen "Needs work" in amber reads before any digit
        does.

        The wash is the accent one, not a flat sunken grey: this section is the
        one on the page that is about the work rather than the article, and it
        should be findable by shape when the editor is scrolled.
      */}
      <section
        aria-labelledby="seo-score-heading"
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-border p-5 sm:flex-row sm:items-center",
          "bg-linear-to-br from-accent-wash to-surface",
        )}
      >
        <ScoreDial score={audit.score} />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="seo-score-heading" className="text-h4">
              Search and AI readiness
            </h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
                audit.score >= 90
                  ? "bg-success-bg text-success"
                  : audit.score >= 55
                    ? "bg-warning-bg text-warning"
                    : "bg-danger-bg text-danger",
              )}
            >
              {scoreLabel(audit.score)}
            </span>
          </div>

          <p className="text-sm text-foreground-muted">
            {audit.failed === 0 && audit.warned === 0
              ? "Every check passes. Nothing here is holding the page back."
              : [
                  audit.failed > 0 ? `${audit.failed} to fix` : null,
                  audit.warned > 0 ? `${audit.warned} worth doing` : null,
                ]
                  .filter(Boolean)
                  .join(", ") + "."}
          </p>
        </div>

        {generate ? (
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <Button
              type="button"
              variant="accent"
              className="rounded-full"
              loading={generate.busy}
              onClick={generate.onClick}
            >
              <Sparkles aria-hidden="true" />
              Write it for me
            </Button>
            {generate.note ? (
              <p className="max-w-[30ch] text-xs text-foreground-subtle sm:text-right">
                {generate.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ── The fields ─────────────────────────────────────────────────── */}
      {children}

      {/* ── Previews ───────────────────────────────────────────────────── */}
      <section
        aria-labelledby="seo-preview-heading"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4"
      >
        <h3
          id="seo-preview-heading"
          className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase"
        >
          How this page appears
        </h3>

        {/* A search result. The layout is Google's, because that is the layout
            the operator is being asked to judge the copy against. */}
        <div className="flex flex-col gap-1">
          <p className="truncate text-xs text-foreground-muted">{preview.crumb}</p>
          <p className="line-clamp-2 text-lead font-medium text-info">{preview.title}</p>
          <p className="line-clamp-2 text-sm text-foreground-muted">{preview.description}</p>
        </div>

        {/*
          And what an assistant would quote.

          Shown separately because it is a different question. A search result is
          judged on whether somebody clicks it; an answer engine never shows the
          page at all, so what matters is whether one passage of it stands alone
          as the answer. Seeing that passage on its own is the only way to tell.
        */}
        {preview.quote ? (
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <p className="text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
              {preview.quoteLabel ?? "What an assistant would quote"}
            </p>
            <blockquote className="border-l-2 border-accent pl-3 text-sm text-foreground">
              {preview.quote}
            </blockquote>
          </div>
        ) : null}
      </section>

      {/* ── The audit ──────────────────────────────────────────────────── */}
      <section aria-labelledby="seo-checks-heading" className="flex flex-col gap-2">
        <h3 id="seo-checks-heading" className="text-h4">
          {open.length > 0 ? "What to do" : "Checks"}
        </h3>

        {open.length > 0 ? (
          <ul className="rounded-2xl border border-border bg-surface px-4">
            {open.map((check) => (
              <CheckRow
                key={check.id}
                check={check}
                onGoToTab={onGoToTab}
                currentTab={currentTab}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-border bg-success-bg p-4 text-sm text-foreground">
            Everything passes. Publish it.
          </p>
        )}

        {passing.length > 0 ? (
          /*
            Collapsed, and native rather than a disclosure component. The passing
            checks are worth being able to read — they are the only place the
            panel says what "good" looks like — but they are not what the screen
            is for, and open by default they push the failures off a phone.
          */
          <details className="group rounded-2xl border border-border bg-surface">
            <summary
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2 text-sm font-semibold text-foreground-muted",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <Check className="size-4 text-success" aria-hidden="true" />
              {passing.length} passing
            </summary>
            <ul className="px-4 pb-1">
              {passing.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}
