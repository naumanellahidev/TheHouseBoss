import { notFound } from "next/navigation";
import { Eye } from "lucide-react";

import { ArticleView } from "@/components/site/article-view";
import { ComplianceFooter } from "@/components/site/compliance-footer";
import { Container } from "@/components/site/container";
import { toArticle } from "@/lib/queries/mappers";
import { getAdminArticleById } from "@/lib/queries/admin";
import { getAdminProfile } from "@/lib/supabase/server";
import { verifyPreviewToken } from "@/lib/preview-token";

/**
 * Draft preview — docs/06 § 5: "Preview opens the real public template in a new
 * tab with a draft token."
 *
 * It sits OUTSIDE the (shell) group deliberately: with the sidebar and the
 * admin top bar around it, a preview would not be showing what the page
 * actually looks like, which is the only thing a preview is for.
 *
 * Access is either an admin session — the normal case, already enforced by
 * middleware — or a signed token, so a draft can be sent to the broker for
 * review without giving them an account.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const admin = await getAdminProfile();
  if (!admin && !verifyPreviewToken(id, token)) notFound();

  const row = await getAdminArticleById(id);
  if (!row) notFound();

  const article = toArticle(row);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main id="main" className="flex-1">
        <ArticleView
          article={article}
          crumbs={[{ href: "#", label: article.title }]}
          banner={
            <div className="bg-warning-bg">
              <Container className="flex flex-wrap items-center gap-3 py-3">
                <Eye className="size-4 shrink-0 text-warning" aria-hidden="true" />
                <p className="text-sm text-foreground">
                  <strong>Draft preview.</strong> This is exactly how the page
                  will look. It is not published and search engines cannot see
                  it.
                </p>
              </Container>
            </div>
          }
        />
      </main>
      <ComplianceFooter />
    </div>
  );
}
