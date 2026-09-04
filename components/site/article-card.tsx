import Link from "next/link";

import { articleHref } from "@/lib/utils/routes";
import { Clock } from "lucide-react";

import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ArticleCard as ArticleCardType } from "@/types/domain";

/**
 * The article card, wherever an article is linked.
 *
 * The whole card is one link, like the property card, so a keyboard user tabs
 * past a card rather than through it.
 *
 * The date is shown as an actual date, never as "2 months ago". A relative
 * timestamp hides how old a market update is, which is precisely the thing a
 * reader needs to know before trusting it (docs/14 § 1, rule 4).
 */

/*
  Where an article lives now comes from `lib/utils/routes.ts`, so the publish
  action and the SEO backfill can ask the same question without importing a
  React component. Re-exported here because every existing call site imports it
  from this module.
*/
export { articleHref };

export function ArticleCard({
  article,
  priority = false,
  className,
}: {
  article: ArticleCardType;
  priority?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("h-full", className)}>
      <Link
        href={articleHref(article)}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
          "transition-[box-shadow,transform] duration-(--dur-base) ease-(--ease-out)",
          "hover:-translate-y-0.5 hover:shadow-md",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        {article.coverKey ? (
          <PropertyImage
            photo={{
              kind: "stored",
              key: article.coverKey,
              w: 1200,
              h: 675,
              alt: article.coverAlt ?? "",
            }}
            size={800}
            sizes={IMAGE_SIZES.cardGrid3}
            priority={priority}
            aspect="16/9"
            className="transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.02]"
          />
        ) : null}

        <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
          {article.city ? (
            <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
              {article.city.name}
            </p>
          ) : null}

          <h3 className="text-h4 font-semibold text-foreground">{article.title}</h3>

          {article.excerpt ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-foreground-muted">
              {article.excerpt}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-foreground-subtle">
            {article.publishedAt ? (
              <time dateTime={article.publishedAt}>
                {formatDate(article.publishedAt)}
              </time>
            ) : null}
            {article.readingMin ? (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                {article.readingMin} min
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

/** 1 col → 2 at 768 → 3 at 1024 (docs/04 § 4). */
export function ArticleGrid({
  articles,
  className,
}: {
  articles: ArticleCardType[];
  className?: string;
}) {
  if (articles.length === 0) return null;

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6",
        className,
      )}
    >
      {articles.map((article, index) => (
        <li key={article.id}>
          <ArticleCard article={article} priority={index < 3} />
        </li>
      ))}
    </ul>
  );
}
