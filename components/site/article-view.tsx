import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";

import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { LeadForm } from "@/components/site/lead-form";
import { RichText, headingsOf } from "@/components/site/rich-text";
import { ShareRow } from "@/components/site/share-row";
import { TableOfContents, MobileToc } from "@/components/site/table-of-contents";
import { formatDate } from "@/lib/utils/date";
import type { Article } from "@/types/domain";

/**
 * The public article template.
 *
 * Shared by the Lake Mary blog, market updates and the admin draft preview, so
 * that "preview" means the real page rather than an approximation of it — which
 * is the only way a preview is worth having (docs/06 § 5).
 *
 * The table of contents is built from the article's own headings, so it needs
 * no separate authoring step and cannot fall out of sync with the body.
 */
export function ArticleView({
  article,
  crumbs,
  /** Rendered above the title on a draft preview. */
  banner,
}: {
  article: Article;
  crumbs: Crumb[];
  banner?: React.ReactNode;
}) {
  const toc = headingsOf(article.bodyJson)
    .filter((heading) => heading.level === 2)
    .map((heading) => ({ id: heading.id, label: heading.label }));

  return (
    <>
      {banner}

      <Section className="pb-0">
        <Container className="flex flex-col gap-5">
          <Breadcrumbs items={crumbs} />

          <div className="flex max-w-[68ch] flex-col gap-4">
            {article.city ? (
              <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                {article.city.name}
              </p>
            ) : null}

            <h1 className="text-h1">{article.title}</h1>

            {article.excerpt ? (
              <p className="text-lead text-foreground-muted">{article.excerpt}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-subtle">
              {article.publishedAt ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {/* Every dated thing on this site shows its date, never a
                      relative "2 months ago" that hides how old it is. */}
                  <time dateTime={article.publishedAt}>
                    {formatDate(article.publishedAt)}
                  </time>
                </span>
              ) : null}

              {article.readingMin ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {article.readingMin} min read
                </span>
              ) : null}
            </div>
          </div>

          {article.coverKey ? (
            <PropertyImage
              photo={{
                kind: "stored",
                key: article.coverKey,
                w: 1600,
                h: 900,
                alt: article.coverAlt ?? "",
              }}
              size={1600}
              sizes={IMAGE_SIZES.fullBleed}
              priority
              aspect="16/9"
              wrapperClassName="rounded-lg"
            />
          ) : null}
        </Container>
      </Section>

      {toc.length >= 3 ? (
        <Container>
          <MobileToc items={toc} />
        </Container>
      ) : null}

      <Section>
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {toc.length >= 3 ? (
            <aside className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-[calc(var(--header-h-lg)+1.5rem)]">
                <TableOfContents items={toc} />
              </div>
            </aside>
          ) : null}

          <div className={toc.length >= 3 ? "lg:col-span-9" : "lg:col-span-8"}>
            <RichText doc={article.bodyJson} />

            <div className="mt-10 flex flex-col gap-6 border-t border-border pt-6">
              <ShareRow title={article.title} />

              {article.tags.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-sm bg-surface-sunken px-2.5 py-1 text-xs text-foreground-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}

              {article.city ? (
                <p className="text-sm text-foreground-muted">
                  More about{" "}
                  <Link
                    href={`/${article.city.slug}`}
                    className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                  >
                    {article.city.name}
                  </Link>
                  , or{" "}
                  <Link
                    href={`/${article.city.slug}/homes-for-sale`}
                    className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
                  >
                    see what is for sale there
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className="mt-12 max-w-[68ch]">
              <LeadForm
                leadType="general"
                heading="Question about any of this?"
                description="I answer every message myself, usually the same business day."
                compact
                submitLabel="Send message"
              />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
