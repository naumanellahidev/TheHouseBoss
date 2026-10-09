import Link from "next/link";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";

import { answerHref, type Answer } from "@/lib/content/answers";
import { cn } from "@/lib/utils";
import { cardShell, stretchedLink } from "@/lib/utils/card-link";

/**
 * A block of links into the answer hub — docs/18 § 5.
 *
 * Used by the city hubs, the contractor page and the buyer guides. Every
 * answer page needs at least one inbound link or it is an orphan, and
 * `scripts/check-internal-links.mjs` fails the build on one, so this component
 * is how the rest of the site carries that obligation without each page
 * inventing its own markup.
 */
export function AnswerLinks({
  answers,
  title,
  lead,
  moreHref,
  moreLabel = "All answers",
  className,
  tone = "default",
}: {
  answers: Answer[];
  title: string;
  lead?: string;
  moreHref?: string;
  moreLabel?: string;
  className?: string;
  /** `invert` for a navy section. */
  tone?: "default" | "invert";
}) {
  if (answers.length === 0) return null;
  const invert = tone === "invert";

  return (
    <section
      aria-labelledby={`${title.replace(/\W+/g, "-").toLowerCase()}-heading`}
      className={cn("flex flex-col gap-5", className)}
    >
      <div className="flex flex-col gap-2">
        <h2
          id={`${title.replace(/\W+/g, "-").toLowerCase()}-heading`}
          className={cn("text-h3", invert && "text-foreground-invert")}
        >
          {title}
        </h2>
        {lead ? (
          <p
            className={cn(
              "max-w-[62ch] text-body",
              invert ? "text-foreground-invert-muted" : "text-foreground-muted",
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {answers.map((answer) => (
          <li key={answer.slug}>
            {/*
              A stretched link (`lib/utils/card-link.ts`): the QUESTION is the
              anchor, which is the most descriptive link text this page could
              offer, and the short answer beneath it is plain text. The whole
              card used to be the link, so its text was the question and the
              answer run together.
            */}
            <div
              className={cn(
                "group flex h-full items-start gap-3 rounded-2xl border p-4",
                "transition-[box-shadow,transform] duration-(--dur-base) ease-(--ease-out)",
                "hover:-translate-y-0.5 hover:shadow-md",
                cardShell,
                invert
                  ? "glass-invert border-border-invert has-[a:focus-visible]:outline-ring-invert"
                  : "border-border bg-surface shadow-xs",
              )}
            >
              <MessageCircleQuestion
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  invert ? "text-azure-400" : "text-accent-quiet",
                )}
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className={cn(
                    "text-body font-semibold",
                    invert ? "text-foreground-invert" : "text-foreground",
                  )}
                >
                  <Link href={answerHref(answer)} className={stretchedLink}>
                    {answer.question}
                  </Link>
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-sm",
                    invert ? "text-foreground-invert-muted" : "text-foreground-muted",
                  )}
                >
                  {answer.body.shortAnswer}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {moreHref ? (
        <Link
          href={moreHref}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold underline-offset-4 hover:underline",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            invert
              ? "text-azure-400 focus-visible:outline-ring-invert"
              : "text-accent-quiet focus-visible:outline-ring",
          )}
        >
          {moreLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
