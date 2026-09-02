import { OG_SIZE, ogResponse, ogTrim } from "@/lib/seo/og";
import { getArticleBySlug } from "@/lib/queries/articles";

export const alt = "Market update from The House Boss";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);

  if (!article) {
    return ogResponse({
      eyebrow: "Market updates",
      title: "Central Florida market updates",
    });
  }

  return ogResponse({
    eyebrow: article.city ? `${article.city.name} · Market update` : "Market update",
    title: ogTrim(article.title, 70),
    subtitle: article.excerpt ? ogTrim(article.excerpt, 110) : undefined,
    facts: article.readingMin ? `${article.readingMin} min read` : undefined,
  });
}
