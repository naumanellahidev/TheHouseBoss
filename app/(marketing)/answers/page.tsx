import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container, Section, SectionHeader } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { heroPhoto } from "@/components/site/media-frame";
import { Button } from "@/components/ui/button";
import {
  ANSWERS,
  ANSWER_CATEGORIES,
  answerHref,
  answersInCategory,
  categoryHref,
} from "@/lib/content/answers";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { cardShell, stretchedLink } from "@/lib/utils/card-link";

export const revalidate = 3600;

const crumbs = [{ href: "/answers", label: "Answers" }];

export const metadata: Metadata = buildMetadata({
  title: "Answers: Central Florida Buying, Selling & Building",
  description:
    "Straight answers to the questions Central Florida buyers, sellers and homeowners actually ask — from a Lake Mary Realtor who is also a licensed residential building contractor.",
  path: "/answers",
});

/**
 * `/answers` — the hub, docs/18 § 2.
 *
 * Every published question in one place, grouped by category. It is a real
 * index rather than a teaser: a visitor who lands here from a search should be
 * able to see that the question they typed is answered, and reach it in one
 * click. That is also what makes the individual pages reachable — an answer
 * with no inbound link is an orphan, and the audit script fails on one.
 */
export default async function AnswersHubPage() {
  const settings = await safeQuery(
    () => getSiteSettings(),
    EMPTY_SETTINGS,
    "getSiteSettings(answers)",
  );

  const photo = heroPhoto(settings.heroKey, settings.heroAlt?.trim() || "Central Florida homes", 1920, 1080);
  const total = ANSWERS.length;

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <PageHero
        overline="Answers"
        title="The questions people actually ask"
        lead={`${total} straight answers about buying, selling, building and maintaining a house in Central Florida — from someone who holds a real-estate licence and a residential contractor licence.`}
        crumbs={crumbs}
        photo={photo}
        size="lg"
      />

      {/* Category jump bar, on glass over the hero edge. */}
      <div className="relative z-10 -mt-8 md:-mt-10">
        <Container>
          <nav
            aria-label="Answer categories"
            className="glass scroll-row gap-2 rounded-2xl p-2 md:flex-wrap"
          >
            {ANSWER_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`#${category.slug}`}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-full border border-transparent px-4 text-sm font-medium",
                  "text-foreground-muted transition-colors duration-(--dur-fast)",
                  "hover:bg-surface-sunken hover:text-foreground",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {category.title}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      <Section>
        <Container className="flex flex-col gap-12">
          <p className="max-w-[68ch] text-lead text-foreground-muted">
            Most of these came up in a conversation before they came up in a
            search. Each one answers the question in the first two sentences and
            then explains what decides the answer — the permit, the insurance
            position, the failure mode, the order of operations.
          </p>

          {ANSWER_CATEGORIES.map((category) => {
            const answers = answersInCategory(category.slug);
            if (answers.length === 0) return null;

            return (
              <section
                key={category.slug}
                id={category.slug}
                aria-labelledby={`${category.slug}-heading`}
                className="flex scroll-mt-28 flex-col gap-5"
              >
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                  <h2 id={`${category.slug}-heading`} className="text-h3">
                    {category.title}
                  </h2>
                  <Link
                    href={categoryHref(category)}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-quiet underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {answers.length} {answers.length === 1 ? "question" : "questions"}
                    {/*
                      The category name, for anything reading the link out of
                      context. "5 questions" appeared under several headings,
                      each pointing somewhere different — the same anchor text
                      for different destinations, which an SEO audit flags and
                      which a screen reader's links list renders as five
                      identical, useless entries (WCAG 2.4.4).
                    */}
                    <span className="sr-only"> about {category.title.toLowerCase()}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>

                <ul className="grid gap-3 md:grid-cols-2">
                  {answers.map((answer) => (
                    <li key={answer.slug}>
                      {/*
                        A stretched link (`lib/utils/card-link.ts`): the question
                        is the anchor, the short answer is plain text. The whole
                        card used to be the link, which made sixty-two anchors on
                        this page each a question and an answer run together.
                      */}
                      <div
                        className={cn(
                          "group flex h-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs",
                          "transition-[box-shadow,transform] duration-(--dur-base) ease-(--ease-out)",
                          "hover:-translate-y-0.5 hover:shadow-md",
                          cardShell,
                        )}
                      >
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-body font-semibold text-foreground">
                            <Link href={answerHref(answer)} className={stretchedLink}>
                              {answer.question}
                            </Link>
                          </span>
                          <span className="line-clamp-2 text-sm text-foreground-muted">
                            {answer.body.shortAnswer}
                          </span>
                        </span>
                        <ArrowRight
                          className="mt-1 size-4 shrink-0 text-foreground-subtle transition-transform duration-(--dur-fast) group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </Container>
      </Section>

      <Section tone="invert">
        <Container className="flex flex-col items-start gap-6">
          <SectionHeader
            invert
            overline="Not here?"
            title="Ask the question directly"
            lead="If your question is not on this page, send it. The answer usually starts with three things I would need to know about the specific house, and I will tell you what those are."
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/contact">Ask a question</Link>
            </Button>
            <Button asChild variant="invert" size="lg">
              <Link href="/hire-contractor">See the contractor services</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
