import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  HardHat,
  Link2,
  MessageSquareQuote,
  Quote,
  ShieldCheck,
  Star,
  Tally5,
} from "lucide-react";

import { Container, Section, SectionHeader } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { MediaFrame, heroPhoto, portraitPhoto } from "@/components/site/media-frame";
import { PageHero } from "@/components/site/page-hero";
import { ReviewForm } from "@/components/site/review-form";
import { Button } from "@/components/ui/button";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { getReviews } from "@/lib/queries/articles";
import { getPageHero } from "@/lib/queries/page-sections";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import type { Review } from "@/types/domain";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Reviews & Client Feedback",
  description:
    "What clients have said about working with Krisi Kakarova — The House Boss, Lake Mary. Every review is one actually received, shown with its source and a link to the original where there is one.",
  path: "/reviews",
});

/**
 * `/reviews` — docs/05 and docs/09 § 7.
 *
 * **No `AggregateRating` markup.** The rule is explicit: do not emit it unless
 * every rating is first-party, verifiable and displayed. A star rating in
 * search results is worth a great deal, which is exactly why fabricated or
 * aggregated review markup carries a Google manual action and an FTC problem.
 * Individual reviews are shown with their source and a link to the original;
 * nothing is summarised into a score.
 *
 * The layout has to look complete with ONE review — which is the launch
 * reality — and still hold forty. The newest review is featured large; any
 * others follow as a wall. Nothing is padded out to fill a grid.
 */

const HOW_IT_WORKS = [
  {
    icon: BadgeCheck,
    title: "Every review shows its source",
    body: "Sent to me directly, or written on Google — it says which, and when.",
  },
  {
    icon: Link2,
    title: "Linked to the original",
    body: "Where a review lives somewhere else, the link goes to it, so you can check it yourself.",
  },
  {
    icon: Tally5,
    title: "No average at the top",
    body: "A score is easy to inflate and tells you less than reading three of these does.",
  },
];

const GOOGLE_STEPS = [
  {
    title: "Open the review box",
    body: "The button below goes straight to the review form on my Google profile — no searching for it.",
  },
  {
    title: "Choose the stars",
    body: "Whatever is honest. Four stars with a real sentence helps more than five with none.",
  },
  {
    title: "Write two sentences",
    body: "What you were trying to do, and what was different about doing it with me. That is what the next person reads.",
  },
];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;

  const [all, hero, settings] = await Promise.all([
    safeQuery(() => getReviews(60), [], "getReviews"),
    getPageHero("reviews"),
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(reviews)"),
  ]);

  const sources = [...new Set(all.map((review) => review.source).filter(Boolean))] as string[];
  const reviews = source ? all.filter((review) => review.source === source) : all;
  const [featured, ...rest] = reviews;

  const crumbs = [{ href: "/reviews", label: "Reviews" }];
  const photo = heroPhoto(hero.imageKey || settings.heroKey, "", 1920, 1080);
  const portrait = portraitPhoto(settings);

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <PageHero
        overline={hero.overline}
        title={hero.title}
        lead={hero.lead}
        crumbs={crumbs}
        photo={photo}
        size="lg"
        aside={
          /*
            The two actions that matter, together. Somebody who has just read
            a review is the likeliest person on the site to write one, and a
            review on Google is what ranks her in the map pack.
          */
          <div className="glass flex flex-col gap-4 rounded-2xl p-5 text-foreground md:p-6 lg:ml-auto lg:max-w-sm">
            <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
              Worked with me?
            </p>
            <p className="text-body text-foreground-muted">
              A few honest sentences help the next buyer or seller decide. Write
              one here, or on Google, where it helps the most.
            </p>
            <ReviewForm variant="accent" size="lg" className="w-full" />
            <Button variant="outline" size="lg" block asChild>
              <a href={siteConfig.google.reviewUrl} target="_blank" rel="noreferrer noopener">
                Review on Google
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          </div>
        }
      />

      {/* ── Source filter, only when there is more than one source ─────── */}
      {sources.length > 1 ? (
        <div className="relative z-10 -mt-8 md:-mt-10">
          <Container>
            <nav
              aria-label="Filter by source"
              className="glass scroll-row gap-2 rounded-2xl p-2 md:flex-wrap"
            >
              <SourceChip href="/reviews" active={!source}>
                Every source
              </SourceChip>
              {sources.map((item) => (
                <SourceChip
                  key={item}
                  href={`/reviews?source=${encodeURIComponent(item)}`}
                  active={source === item}
                >
                  {item}
                </SourceChip>
              ))}
            </nav>
          </Container>
        </div>
      ) : null}

      {featured ? (
        <>
          {/* ── Featured review ─────────────────────────────────────────── */}
          <Section>
            <Container
              className={cn(
                "grid gap-10 lg:items-center lg:gap-16",
                portrait && "lg:grid-cols-12",
              )}
            >
              {portrait ? (
                <div className="lg:col-span-4">
                  <MediaFrame
                    photo={portrait}
                    sizes={IMAGE_SIZES.portrait}
                    aspect="4/5"
                    className="mx-auto max-w-xs lg:max-w-none"
                  />
                </div>
              ) : null}

              <figure className={cn("flex flex-col gap-6", portrait && "lg:col-span-8")}>
                <Quote className="size-10 text-accent-quiet" aria-hidden="true" />
                <Stars rating={featured.rating} size="lg" />
                <blockquote className="font-display text-h3 leading-snug text-foreground text-pretty">
                  {featured.body}
                </blockquote>
                <figcaption className="flex flex-col gap-1 border-t border-border pt-5">
                  <span className="text-body font-semibold text-foreground">
                    {featured.authorName}
                  </span>
                  {featured.authorRole ? (
                    <span className="text-sm text-foreground-muted">{featured.authorRole}</span>
                  ) : null}
                  <ReviewMeta review={featured} />
                </figcaption>
              </figure>
            </Container>
          </Section>

          {/* ── How reviews work here ───────────────────────────────────── */}
          <Section tone="sunken">
            <Container className="flex flex-col gap-8">
              <SectionHeader
                overline="How reviews work here"
                title="Read them, not a score"
              />
              <ul className="grid gap-4 md:grid-cols-3">
                {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-11 items-center justify-center rounded-xl bg-accent-wash text-accent-quiet"
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-h4 font-semibold">{title}</h3>
                    <p className="text-sm text-foreground-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </Container>
          </Section>

          {/* ── The rest, as a wall ─────────────────────────────────────── */}
          {rest.length > 0 ? (
            <Section>
              <Container className="flex flex-col gap-8">
                <SectionHeader overline="More from clients" title="In their words" />
                <ul className="columns-1 gap-5 md:columns-2 lg:columns-3 [&>li]:mb-5 [&>li]:break-inside-avoid">
                  {rest.map((review) => (
                    <li key={review.id}>
                      <figure className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm">
                        <Stars rating={review.rating} />
                        <blockquote className="text-body leading-relaxed text-foreground-muted">
                          {review.body}
                        </blockquote>
                        <figcaption className="flex flex-col gap-1 border-t border-border pt-3">
                          <span className="text-sm font-semibold text-foreground">
                            {review.authorName}
                          </span>
                          {review.authorRole ? (
                            <span className="text-xs text-foreground-subtle">
                              {review.authorRole}
                            </span>
                          ) : null}
                          <ReviewMeta review={review} />
                        </figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              </Container>
            </Section>
          ) : null}
        </>
      ) : (
        <Section>
          <Container>
            <EmptyState
              icon={MessageSquareQuote}
              title="Reviews are being gathered"
              description="Rather than publish a thin page, nothing goes up here until there is enough to be worth reading. In the meantime, ask and I will put you in touch with recent clients directly."
              actions={
                <Button asChild variant="accent">
                  <Link href="/contact">Ask for references</Link>
                </Button>
              }
            />
          </Container>
        </Section>
      )}

      {/* ── Google, in three steps ───────────────────────────────────────── */}
      <Section tone="invert">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            invert
            overline="On Google"
            title="A Google review takes two minutes"
            lead="Reviews on Google are what put a local agent in front of the next person searching. If we have worked together, this is the most useful thing you can do for me."
          />
          <ol className="grid gap-4 md:grid-cols-3">
            {GOOGLE_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="glass-invert flex flex-col gap-3 rounded-2xl p-6"
              >
                <span aria-hidden="true" className="font-display text-h2 text-azure-400 tabular">
                  {index + 1}
                </span>
                <h3 className="text-h4 font-semibold text-foreground-invert">{step.title}</h3>
                <p className="text-sm text-foreground-invert-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <a href={siteConfig.google.reviewUrl} target="_blank" rel="noreferrer noopener">
                Open the review box
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="invert" size="lg">
              <a href={siteConfig.google.mapsUrl} target="_blank" rel="noreferrer noopener">
                See the Google profile
              </a>
            </Button>
          </div>
        </Container>
      </Section>

      {/* ── Licences and a way in ────────────────────────────────────────── */}
      <Section>
        <Container>
          <div className="flex flex-col gap-8 rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8 lg:flex-row lg:items-center lg:justify-between">
            <ul className="grid gap-5 sm:grid-cols-3 lg:gap-10">
              <Credential
                icon={ShieldCheck}
                label={siteConfig.licenses.realEstate.label}
                value={siteConfig.licenses.realEstate.number}
              />
              <Credential
                icon={HardHat}
                label={siteConfig.licenses.contractor.label}
                value={siteConfig.licenses.contractor.number}
              />
              <Credential icon={Building2} label="Brokerage" value={siteConfig.brokerage} />
            </ul>
            <Button asChild variant="accent" size="lg" className="shrink-0">
              <Link href="/contact">Talk to Krisi</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Stars({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "lg" }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: rating }).map((_, i) => (
        <Star
          key={i}
          className={cn("fill-current text-accent", size === "lg" ? "size-5" : "size-4")}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{rating} out of 5</span>
    </div>
  );
}

function ReviewMeta({ review }: { review: Review }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-subtle">
      {review.source ? <span>via {review.source}</span> : null}
      {review.reviewedAt ? (
        <time dateTime={review.reviewedAt}>{formatDate(review.reviewedAt)}</time>
      ) : null}
      {review.sourceUrl ? (
        <a
          href={review.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center gap-1 font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
        >
          Original
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
    </span>
  );
}

function Credential({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-wash text-accent-quiet"
      >
        <Icon className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-foreground-subtle">{label}</span>
        <span className="text-sm font-semibold text-foreground tabular">{value}</span>
      </span>
    </li>
  );
}

function SourceChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary bg-primary text-primary-fg"
          : "border-transparent text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
