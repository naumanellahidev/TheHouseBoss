import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, MessageSquareQuote, Star } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getReviews } from "@/lib/queries/articles";
import { safeQuery } from "@/lib/queries/safe";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

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
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const all = await safeQuery(() => getReviews(60), [], "getReviews");

  const sources = [...new Set(all.map((review) => review.source).filter(Boolean))] as string[];
  const reviews = source ? all.filter((review) => review.source === source) : all;

  const crumbs = [{ href: "/reviews", label: "Reviews" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Reviews</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            Every review here is one I actually received, shown with where it
            came from and a link to the original where there is one. There is no
            star rating summarised at the top of this page, deliberately — an
            average is easy to inflate and tells you less than reading three of
            these does.
          </p>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container className="flex flex-col gap-6">
          {sources.length > 1 ? (
            <nav aria-label="Filter by source" className="scroll-row gap-2 md:flex-wrap">
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
          ) : null}

          {reviews.length === 0 ? (
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
          ) : (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <li key={review.id}>
                  <figure className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm">
                    {review.rating ? (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="size-4 fill-current text-accent"
                            aria-hidden="true"
                          />
                        ))}
                        <span className="sr-only">
                          {review.rating} out of 5
                        </span>
                      </div>
                    ) : null}

                    <blockquote className="text-body leading-relaxed text-foreground-muted">
                      {review.body}
                    </blockquote>

                    <figcaption className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
                      <span className="text-sm font-semibold text-foreground">
                        {review.authorName}
                      </span>
                      {review.authorRole ? (
                        <span className="text-xs text-foreground-subtle">
                          {review.authorRole}
                        </span>
                      ) : null}
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-subtle">
                        {review.source ? <span>via {review.source}</span> : null}
                        {review.reviewedAt ? (
                          <time dateTime={review.reviewedAt}>
                            {formatDate(review.reviewedAt)}
                          </time>
                        ) : null}
                        {review.sourceUrl ? (
                          <a
                            href={review.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                          >
                            Original
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        ) : null}
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
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
          ? "border-accent bg-accent-wash text-foreground"
          : "border-border-strong bg-surface text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
