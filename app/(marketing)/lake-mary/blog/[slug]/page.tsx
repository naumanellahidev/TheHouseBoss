import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/site/article-view";
import { JsonLd } from "@/components/site/json-ld";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticleBySlug, getArticleSlugsForStaticParams } from "@/lib/queries/articles";
import { keyUrl } from "@/lib/storage/url";

/**
 * A Lake Mary blog post.
 *
 * Market updates live under /market-updates instead, so this route refuses one
 * rather than serving the same article at two URLs — a duplicate is worse than
 * a 404 for a page whose whole purpose is to be cited.
 *
 * No `loading.tsx`: this route calls `notFound()`.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getArticleSlugsForStaticParams("blog");
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
    return { title: "Article not found", robots: { index: false, follow: true } };
  }

  return buildMetadata({
    title: article.metaTitle || article.title,
    description:
      article.metaDesc ||
      article.excerpt ||
      `${article.title} — from The House Boss, Lake Mary.`,
    path: `/lake-mary/blog/${article.slug}`,
    // The route generates its own card unless the article has a cover image.
    image: article.coverKey ? keyUrl(article.coverKey, 1600) : null,
    type: "article" as const,
    publishedTime: article.publishedAt ?? undefined,
    modifiedTime: article.updatedAt,
  });
}

export default async function LakeMaryBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);

  if (!article || article.kind === "market_update") notFound();

  const crumbs = [
    { href: "/lake-mary", label: "Lake Mary" },
    { href: "/lake-mary/blog", label: "Blog" },
    { href: `/lake-mary/blog/${article.slug}`, label: article.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: article.title,
            description: article.metaDesc || article.excerpt || article.title,
            path: `/lake-mary/blog/${article.slug}`,
            image: article.coverKey ? keyUrl(article.coverKey, 1600) : undefined,
            publishedAt: article.publishedAt,
            modifiedAt: article.updatedAt,
            section: article.city?.name ?? "Lake Mary",
          }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <ArticleView article={article} crumbs={crumbs} />
    </>
  );
}
