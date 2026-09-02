import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/site/article-view";
import { Container, Section } from "@/components/site/container";
import { Disclaimer } from "@/components/site/disclaimer";
import { JsonLd } from "@/components/site/json-ld";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticleBySlug, getArticleSlugsForStaticParams } from "@/lib/queries/articles";
import { keyUrl } from "@/lib/storage/url";

/**
 * A market update.
 *
 * docs/09 § 6 requires the estimate disclaimer AND an "as of" date on these
 * pages. The date comes from the article's own published date, shown by
 * <ArticleView />; the disclaimer is added below the body.
 *
 * No `loading.tsx`: this route calls `notFound()`.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getArticleSlugsForStaticParams("market_update");
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);

  if (!article) {
    return { title: "Update not found", robots: { index: false, follow: true } };
  }

  return buildMetadata({
    title: article.metaTitle || article.title,
    description:
      article.metaDesc ||
      article.excerpt ||
      `${article.title} — Central Florida market update from The House Boss.`,
    path: `/market-updates/${article.slug}`,
    // The route generates its own card unless the article has a cover image.
    image: article.coverKey ? keyUrl(article.coverKey, 1600) : null,
    type: "article" as const,
    publishedTime: article.publishedAt ?? undefined,
    modifiedTime: article.updatedAt,
  });
}

export default async function MarketUpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);

  if (!article) notFound();

  const crumbs = [
    { href: "/market-updates", label: "Market Updates" },
    { href: `/market-updates/${article.slug}`, label: article.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: article.title,
            description: article.metaDesc || article.excerpt || article.title,
            path: `/market-updates/${article.slug}`,
            image: article.coverKey ? keyUrl(article.coverKey, 1600) : undefined,
            publishedAt: article.publishedAt,
            modifiedAt: article.updatedAt,
            section: "Market updates",
          }),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <ArticleView article={article} crumbs={crumbs} />

      <Section className="pt-0">
        <Container className="max-w-[68ch]">
          <Disclaimer type="estimate" />
        </Container>
      </Section>
    </>
  );
}
