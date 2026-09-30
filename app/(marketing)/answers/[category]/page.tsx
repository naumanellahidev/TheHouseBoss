import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Container, Section, SectionHeader } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { heroPhoto } from "@/components/site/media-frame";
import { Button } from "@/components/ui/button";
import {
  ANSWER_CATEGORIES,
  answerHref,
  answersInCategory,
  categoryHref,
  getCategory,
} from "@/lib/content/answers";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { getSeoOverride } from "@/lib/queries/seo";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

/** Nine categories, known at build time. */
export function generateStaticParams() {
  return ANSWER_CATEGORIES.filter(
    (category) => answersInCategory(category.slug).length > 0,
  ).map((category) => ({ category: category.slug }));
}

/**
 * What each category is for, in a sentence.
 *
 * Written here rather than in the JSON because it is page copy, not data: the
 * JSON names the category, this says why a visitor would open it.
 */
const BLURB: Record<string, string> = {
  "buying-and-selling":
    "Choosing a town, judging a premium, reading an appraisal, and deciding what to fix before the photographs are taken.",
  "inspections-and-insurance":
    "What a Florida inspection report is really telling you, which reports your insurer wants, and the retrofits that change the premium.",
  "new-construction-and-building":
    "Lots, budgets, builder contracts and permits — the decisions that are cheap on paper and expensive after the slab is poured.",
  "hiring-and-project-planning":
    "How to check a contractor, what payment terms are normal, and how to be the job that gets called back.",
  "additions-and-conversions":
    "Adding space rather than moving: additions, accessory dwellings, garage conversions and what a load-bearing wall really costs.",
  "kitchens-and-bathrooms":
    "Where the money goes in a kitchen or bathroom, and which details decide whether the work is still sound in ten years.",
  "exterior-and-florida-climate":
    "Stucco, roofs, pool cages, driveways and paint — how this climate treats the outside of a house.",
  "systems-and-maintenance":
    "Plumbing, air conditioning, energy and the short maintenance list that prevents most expensive calls in Florida.",
  "investors-and-landlords":
    "Scoping a flip, turning over a rental, and modelling Central Florida returns with the operating costs that actually apply.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Not found", robots: { index: false, follow: true } };

  const answers = answersInCategory(slug);
  const override = await getSeoOverride(`/answers/${slug}`);

  return buildMetadata({
    override,
    title: `${category.title} — Central Florida Answers`,
    description:
      BLURB[slug] ??
      `${answers.length} answers about ${category.title.toLowerCase()} in Central Florida, from a Realtor who is also a licensed residential building contractor.`,
    path: `/answers/${slug}`,
  });
}

export default async function AnswerCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  const answers = answersInCategory(slug);

  if (!category || answers.length === 0) notFound();

  const settings = await safeQuery(
    () => getSiteSettings(),
    EMPTY_SETTINGS,
    "getSiteSettings(answer category)",
  );

  const crumbs = [
    { href: "/answers", label: "Answers" },
    { href: `/answers/${slug}`, label: category.title },
  ];

  const others = ANSWER_CATEGORIES.filter(
    (item) => item.slug !== slug && answersInCategory(item.slug).length > 0,
  );

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <PageHero
        overline="Answers"
        title={category.title}
        lead={BLURB[slug]}
        crumbs={crumbs}
        photo={heroPhoto(settings.heroKey, "", 1920, 1080)}
        size="md"
      />

      <Section>
        <Container className="flex flex-col gap-8">
          <h2 className="text-h3">
            {answers.length} {answers.length === 1 ? "question" : "questions"}
          </h2>

          <ul className="flex flex-col gap-4">
            {answers.map((answer) => (
              <li key={answer.slug}>
                <Link
                  href={answerHref(answer)}
                  className={cn(
                    "group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-xs md:p-6",
                    "transition-[box-shadow,transform] duration-(--dur-base) ease-(--ease-out)",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  <span className="text-h4 font-semibold text-foreground">
                    {answer.question}
                  </span>
                  <span className="text-body text-foreground-muted">
                    {answer.body.shortAnswer}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-quiet">
                    Read the answer
                    <ArrowRight
                      className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="sunken">
        <Container className="flex flex-col gap-6">
          <SectionHeader overline="Keep reading" title="The other categories" />
          <ul className="flex flex-wrap gap-2">
            {others.map((item) => (
              <li key={item.slug}>
                <Link
                  href={categoryHref(item)}
                  className="inline-flex min-h-11 items-center rounded-full border border-border-strong bg-surface px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Button asChild variant="outline">
              <Link href="/answers">All answers</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
