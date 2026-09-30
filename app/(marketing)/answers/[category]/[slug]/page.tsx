import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, MapPin, Sparkles } from "lucide-react";

import { AnswerProse } from "@/components/site/answer-prose";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { MediaFrame, portraitPhoto } from "@/components/site/media-frame";
import { Button } from "@/components/ui/button";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import {
  ANSWERS,
  answerDescription,
  answerHref,
  answerPlainText,
  getAnswer,
  getCategory,
  serviceLink,
  siblingAnswers,
} from "@/lib/content/answers";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { getSeoOverride } from "@/lib/queries/seo";
import { breadcrumbJsonLd, qaPageJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { allCities, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";

export const revalidate = 3600;

/** Every published answer, known at build time (docs/18 § 2). */
export function generateStaticParams() {
  return ANSWERS.map((answer) => ({
    category: answer.category,
    slug: answer.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const answer = getAnswer(slug);
  if (!answer) return { title: "Not found", robots: { index: false, follow: true } };

  const path = answerHref(answer);
  const override = await getSeoOverride(path);

  return buildMetadata({
    override,
    /*
      The question is the title, near enough verbatim. It is what somebody
      typed, and rewriting it into a keyword phrase is how a page stops
      matching the search that would have found it.
    */
    title: answer.question,
    description: answerDescription(answer.body),
    path,
  });
}

const cityName = (slug: string) =>
  allCities.find((city) => city.slug === slug)?.name ?? slug;

export default async function AnswerPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const answer = getAnswer(slug);
  const category = getCategory(categorySlug);

  // A slug reached under the wrong category is a different URL for the same
  // page, so it 404s rather than rendering a duplicate.
  if (!answer || !category || answer.category !== categorySlug) notFound();

  const settings = await safeQuery(
    () => getSiteSettings(),
    EMPTY_SETTINGS,
    "getSiteSettings(answer)",
  );

  const path = answerHref(answer);
  const crumbs = [
    { href: "/answers", label: "Answers" },
    { href: `/answers/${category.slug}`, label: category.title },
    { href: path, label: answer.question },
  ];

  const siblings = siblingAnswers(answer);
  const cities = answer.cities.filter((city) =>
    allCities.some((known) => known.slug === city),
  );
  const services = answer.relatedServices
    .map((service) => serviceLink(service))
    .filter((link): link is { href: string; label: string } => Boolean(link));

  const portrait = portraitPhoto(settings);

  return (
    <>
      <JsonLd
        data={[
          qaPageJsonLd({
            question: answer.question,
            answerText: answerPlainText(answer.body),
            path,
            updated: answer.body.updated,
          }),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <Section className="pb-0">
        <Container className="flex max-w-(--container-prose) flex-col gap-6">
          <Breadcrumbs items={crumbs} />

          <div className="flex flex-col gap-3">
            <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
              {category.title}
            </p>
            {/* The question verbatim, question mark included. */}
            <h1 className="text-h1 text-foreground">{answer.question}</h1>
          </div>

          {/*
            The short answer, inside the first hundred words. This is the block
            a featured snippet lifts and an AI search engine quotes, so it
            answers the question outright rather than introducing it.
          */}
          <div className="flex gap-4 rounded-2xl border border-accent/30 bg-accent-wash p-5 md:p-6">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
            <div className="flex flex-col gap-1.5">
              <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                Short answer
              </p>
              <p className="text-lead text-foreground">{answer.body.shortAnswer}</p>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container className="flex max-w-(--container-prose) flex-col gap-10">
          <AnswerProse sections={answer.body.sections} />

          {/* ── Who wrote this ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center md:p-6">
            {portrait ? (
              <MediaFrame
                photo={portrait}
                sizes={IMAGE_SIZES.thumb}
                aspect="1/1"
                className="w-20 shrink-0"
              />
            ) : null}
            <div className="flex flex-col gap-1.5">
              <p className="text-body font-semibold text-foreground">
                {siteConfig.knownAs}, {siteConfig.brokerage}
              </p>
              <p className="text-sm leading-relaxed text-foreground-muted">
                A licensed Florida Realtor ({siteConfig.licenses.realEstate.number}) and a
                Certified Residential Building Contractor (
                {siteConfig.licenses.contractor.number}), working in Seminole, Orange and
                Volusia County. Holding both is why these answers price the transaction and
                the construction together — <Link
                  href="/about"
                  className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                >
                  more about how I work
                </Link>
                .
              </p>
              <p className="text-xs text-foreground-subtle">
                Last reviewed{" "}
                <time dateTime={answer.body.updated}>{formatDate(answer.body.updated)}</time>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Related: siblings, the city, the service ─────────────────────── */}
      <Section tone="sunken">
        <Container className="flex max-w-(--container-prose) flex-col gap-8">
          {siblings.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-h4">Related questions</h2>
              <ul className="flex flex-col gap-3">
                {siblings.map((sibling) => (
                  <li key={sibling.slug}>
                    <Link
                      href={answerHref(sibling)}
                      className={cn(
                        "group flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-4",
                        "transition-colors duration-(--dur-fast) hover:bg-accent-wash",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      )}
                    >
                      <span className="text-body font-medium text-foreground">
                        {sibling.question}
                      </span>
                      <ArrowRight
                        className="mt-1 size-4 shrink-0 text-foreground-subtle transition-transform duration-(--dur-fast) group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {cities.length > 0 || services.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-h4">Where this applies</h2>
              <ul className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <li key={city}>
                    <Link
                      href={`/${city}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <MapPin className="size-4 text-accent-quiet" aria-hidden="true" />
                      {cityName(city)} guide
                    </Link>
                  </li>
                ))}
                {services.map((service) => (
                  <li key={service.href}>
                    <Link
                      href={service.href}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <BadgeCheck className="size-4 text-accent-quiet" aria-hidden="true" />
                      {service.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </Section>

      {/* ── One call to action ───────────────────────────────────────────── */}
      <Section tone="invert">
        <Container className="flex max-w-(--container-prose) flex-col items-start gap-5">
          <h2 className="text-h3 text-foreground-invert">
            Want this answered for your house?
          </h2>
          <p className="max-w-[58ch] text-lead text-foreground-invert-muted">
            Send the address or the plan. You will get the same answer as above, with the
            part that depends on your roof, your slab and your street filled in.
          </p>
          <Button asChild variant="accent" size="lg">
            <Link href="/contact">Ask about your house</Link>
          </Button>
        </Container>
      </Section>
    </>
  );
}
