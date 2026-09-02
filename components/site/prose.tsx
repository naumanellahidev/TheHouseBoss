import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Long-form typography.
 *
 * Measure is capped at 68ch (docs/03-design-system.md § 2, prose rules) and
 * body copy steps up to --text-lead for reading comfort, while UI stays at 16px.
 *
 * Tables inside prose scroll in their own container rather than pushing the
 * page sideways — the single most common source of horizontal overflow on
 * content pages (docs/04-responsive-spec.md § 2).
 */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-lead text-foreground-muted",
        // headings
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-h2 [&_h2]:text-foreground",
        "[&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28",
        "[&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-h3 [&_h3]:text-foreground",
        "[&_h4]:mt-7 [&_h4]:mb-2 [&_h4]:text-h4 [&_h4]:text-foreground",
        "[&>*:first-child]:mt-0",
        // body
        "[&_p]:my-4 [&_p]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        // lists
        "[&_ul]:my-4 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5",
        "[&_ol]:my-4 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5",
        "[&_li]:pl-1 [&_li]:marker:text-accent-quiet",
        // links
        "[&_a]:text-accent-quiet [&_a]:underline [&_a]:underline-offset-4",
        "[&_a:hover]:text-foreground",
        // quotes
        "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent",
        "[&_blockquote]:pl-5 [&_blockquote]:text-foreground [&_blockquote]:italic",
        // tables must scroll, never overflow the page
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left",
        "[&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-[0.08em] [&_th]:uppercase",
        "[&_th]:text-foreground-subtle",
        "[&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top",
        "[&_hr]:my-10 [&_hr]:border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Wrap any wide table so it scrolls inside its own container. */
export function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
      <div className="min-w-[34rem]">{children}</div>
    </div>
  );
}

/**
 * A pulled-out point. Used for the single most consequential sentence on a
 * page — e.g. "register your agent before your first builder visit".
 */
export function Callout({
  title,
  tone = "accent",
  children,
}: {
  title?: string;
  tone?: "accent" | "warning" | "info";
  children: React.ReactNode;
}) {
  return (
    <aside
      className={cn(
        "my-8 rounded-lg border-l-4 p-5 md:p-6",
        tone === "accent" && "border-l-accent bg-accent-wash",
        tone === "warning" && "border-l-warning bg-warning-bg",
        tone === "info" && "border-l-info bg-info-bg",
      )}
    >
      {title ? (
        <h3 className="mt-0 mb-2 text-h4 font-semibold text-foreground">
          {title}
        </h3>
      ) : null}
      <div className="text-body text-foreground-muted [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3">
        {children}
      </div>
    </aside>
  );
}

/**
 * The answer-first opener every section needs.
 *
 * docs/14-content-plan.md § 1, rule 1: each section opens with a direct
 * one- or two-sentence answer, then supports it. Assistants extract the first
 * clear statement, so this is styled to be visually first as well.
 */
export function AnswerFirst({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-4 border-l-2 border-accent pl-4 text-lead font-medium text-foreground">
      {children}
    </p>
  );
}
