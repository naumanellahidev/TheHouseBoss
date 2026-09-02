import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "@/components/admin/articles/article-form";
import { Badge } from "@/components/ui/badge";
import { getAdminArticleById, getAdminCities, getKnownTags } from "@/lib/queries/admin";
import type { ArticleInput } from "@/lib/validation/article";

export const metadata = { title: "Edit article" };

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [article, cities, knownTags] = await Promise.all([
    getAdminArticleById(id),
    getAdminCities(),
    getKnownTags(),
  ]);

  if (!article) notFound();

  const initial = {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    bodyJson: article.body_json ?? { type: "doc", content: [] },
    bodyText: article.body_text ?? "",
    kind: article.kind,
    cityId: article.city_id,
    communityId: article.community_id,
    tags: article.tags ?? [],
    coverKey: article.cover_key,
    coverAlt: article.cover_alt,
    metaTitle: article.meta_title,
    metaDesc: article.meta_desc,
    status: article.status,
  } as unknown as ArticleInput;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={article.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={article.status === "published" ? "active" : "neutral"}>
              {article.status}
            </Badge>
            {article.reading_min ? (
              <span>{article.reading_min} min read</span>
            ) : null}
          </span>
        }
      />
      <ArticleForm
        articleId={article.id}
        initial={initial}
        cities={cities}
        knownTags={knownTags}
        publishedAt={article.published_at}
      />
    </div>
  );
}
