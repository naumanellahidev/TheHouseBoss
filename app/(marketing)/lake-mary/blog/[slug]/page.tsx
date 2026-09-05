import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/site/article-view";
import { JsonLd } from "@/components/site/json-ld";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { getSeoOverride } from "@/lib/queries/seo";
import { autoArticleDescription } from "@/lib/seo/auto/generate";
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

  const override = await getSeoOverride(`/lake-mary/blog/${article.slug}`);

  return buildMetadata({
    override,
    title: article.metaTitle || article.title,
    /*
      Generated, not concatenated.

      This was `metaDesc || excerpt || "{title} — ..."`, a truthiness chain, so
      a 40-character meta description won and the final fallback was almost
      always under the 140 floor. `autoArticleDescription` prefers the admin's
      own text when it is long enough and composes one from the body when it is
      not, so this can no longer emit a short description.
    */
    description: autoArticleDescription(article),
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
            /*
              The SAME string the meta description carries.

              This was its own `||` chain, so the structured data and the meta
              tag could disagree about what the article is about — and the
              structured data is the one an assistant trusts. One generator,
              one answer.
            */
            description: autoArticleDescription(article),
            path: `/lake-mary/blog/${article.slug}`,
            image: article.coverKey ? keyUrl(article.coverKey, 1600) : undefined,
            publishedAt: article.publishedAt,
            modifiedAt: article.updatedAt,
            // docs/08 asks for it, and it is what an assistant uses to judge
            // whether a page is a real article or a stub before citing it.
            wordCount: article.bodyText
              ? article.bodyText.trim().split(/\s+/).filter(Boolean).length
              : undefined,
            section: article.city?.name ?? "Lake Mary",
          }),
          /*
            §21, §22. FAQPage ONLY when the page renders those questions.
            `ArticleView` reads the same `article.faq` array, so the markup
            cannot describe something the reader does not see.
          */
          ...(article.faq.length > 0 ? [faqJsonLd(article.faq)] : []),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <ArticleView article={article} crumbs={crumbs} />
    </>
  );
}
