import { AdminPageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "@/components/admin/articles/article-form";
import { getAdminCities, getKnownTags } from "@/lib/queries/admin";
import type { ArticleInput } from "@/lib/validation/article";

export const metadata = { title: "New article" };

/**
 * Write a new article.
 *
 * No row exists until the first save, which is why the cover field and the
 * editor's image button say so: images are filed under `articles/{id}/`, so
 * there is nowhere to put them until the article exists.
 */
export default async function NewArticlePage() {
  const [cities, knownTags] = await Promise.all([getAdminCities(), getKnownTags()]);

  const initial: ArticleInput = {
    slug: "",
    title: "",
    excerpt: null,
    bodyJson: { type: "doc", content: [] },
    bodyText: "",
    kind: "blog",
    cityId: null,
    communityId: null,
    tags: [],
    faq: [],
    coverKey: null,
    coverAlt: null,
    metaTitle: null,
    metaDesc: null,
    status: "draft",
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="New article"
        description="Write it, save a draft, then preview it before publishing."
      />
      <ArticleForm
        articleId={null}
        initial={initial}
        cities={cities}
        knownTags={knownTags}
      />
    </div>
  );
}
