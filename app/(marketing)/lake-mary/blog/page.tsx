import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";

import { ArticleGrid } from "@/components/site/article-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticles } from "@/lib/queries/articles";
import { safeQuery } from "@/lib/queries/safe";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Lake Mary Blog | Neighbourhoods, Market & Local Knowledge",
  description:
    "Writing about Lake Mary, Florida — its neighbourhoods, what the market is actually doing, and the practical things worth knowing before you buy or sell a home here.",
  path: "/lake-mary/blog",
});

export default async function LakeMaryBlogPage() {
  const articles = await safeQuery(
    () => getArticles({ citySlug: "lake-mary", limit: 48 }),
    [],
    "getArticles(lake-mary blog)",
  );

  const crumbs = [
    { href: "/lake-mary", label: "Lake Mary" },
    { href: "/lake-mary/blog", label: "Blog" },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Writing about Lake Mary</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            The city I live in. Neighbourhood notes, what the market is actually
            doing, and the questions I get asked most often.
          </p>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container>
          {articles.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="The first piece is being written"
              description="In the meantime, the Lake Mary guide covers the schools, the commute and what the neighbourhoods are actually like."
              actions={
                <Button asChild variant="accent">
                  <Link href="/lake-mary">Read the Lake Mary guide</Link>
                </Button>
              }
            />
          ) : (
            <ArticleGrid articles={articles} />
          )}
        </Container>
      </Section>
    </>
  );
}
