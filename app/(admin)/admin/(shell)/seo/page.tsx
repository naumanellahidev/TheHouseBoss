import Link from "next/link";
import { ArrowRight, Globe, Route as RouteIcon, ShieldAlert } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveTable } from "@/components/site/responsive-table";
import { Badge } from "@/components/ui/badge";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { getRedirects, getSeoPages } from "@/lib/queries/platform";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * The SEO centre: per-page overrides, redirects, and sitemap status.
 *
 * **An override is an override, not a requirement.** A path with no `seo_pages`
 * row falls back to the builders in `lib/seo/metadata.ts`, which already
 * produce a correct title, description and canonical for every route. So an
 * empty table here is the healthy state, not a gap — which is why the empty
 * state says so rather than nagging.
 *
 * Title and description limits are enforced by CHECK constraints on the table,
 * the same numbers `scripts/check-seo.mjs` asserts against rendered pages. A
 * value typed here cannot fail that guard, because the database refuses it
 * first.
 */
export default async function SeoPage() {
  const identity = await getAdminIdentity();

  if (!identity?.permissions.includes("manage_seo")) {
    return (
      <>
        <AdminPageHeader title="SEO" />
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to SEO settings"
          description="Editing metadata and redirects needs the manage_seo permission."
        />
      </>
    );
  }

  const [pages, redirects] = await Promise.all([getSeoPages(), getRedirects()]);

  return (
    <>
      <AdminPageHeader
        title="SEO"
        description="Per-page metadata overrides, permanent redirects, and sitemap status."
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold">Page overrides</h2>

        {pages.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No overrides — that is the healthy state"
            description="Every route already gets a title, description and canonical from lib/seo/metadata.ts. Add a row here only to override one of them for a specific path."
          />
        ) : (
          <ResponsiveTable
            caption="Per-page SEO overrides"
            columns={[
              { key: "path", header: "Path", primary: true },
              { key: "title", header: "Title" },
              { key: "robots", header: "Robots" },
              { key: "updated", header: "Updated", hideOnCard: true },
            ]}
            rows={pages}
            getRowKey={(row) => row.id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "path":
                  return (
                    <code className="text-sm">{row.path}</code>
                  );
                case "title":
                  return (
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm">{row.title ?? "—"}</span>
                      {row.title ? (
                        <span className="text-xs text-foreground-subtle tabular">
                          {row.title.length}/60 characters
                        </span>
                      ) : null}
                    </span>
                  );
                case "robots":
                  return row.noindex || row.nofollow ? (
                    <Badge tone="pending">
                      {[row.noindex && "noindex", row.nofollow && "nofollow"]
                        .filter(Boolean)
                        .join(", ")}
                    </Badge>
                  ) : (
                    <Badge tone="active">Indexable</Badge>
                  );
                case "updated":
                  return (
                    <span className="text-xs text-foreground-subtle tabular">
                      {formatDate(row.updatedAt)}
                    </span>
                  );
                default:
                  return null;
              }
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold">Redirects</h2>
        <p className="text-sm text-foreground-muted">
          Written automatically whenever a published slug changes, so an indexed
          URL never starts returning 404 (CLAUDE.md HR11). They can also be added
          by hand for a URL that moved before this site existed.
        </p>

        {redirects.length === 0 ? (
          <EmptyState
            icon={RouteIcon}
            title="No redirects yet"
            description="One appears here the first time a published listing or article slug is edited."
          />
        ) : (
          <ResponsiveTable
            caption="Permanent redirects"
            columns={[
              { key: "from", header: "From", primary: true },
              { key: "to", header: "To" },
              { key: "code", header: "Status" },
            ]}
            rows={redirects}
            getRowKey={(row) => row.id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "from":
                  return <code className="text-sm">{row.fromPath}</code>;
                case "to":
                  return (
                    <span className="flex items-center gap-1.5">
                      <ArrowRight
                        className="size-3.5 shrink-0 text-foreground-subtle"
                        aria-hidden="true"
                      />
                      <code className="text-sm">{row.toPath}</code>
                    </span>
                  );
                case "code":
                  return <Badge tone="neutral">{row.statusCode}</Badge>;
                default:
                  return null;
              }
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-semibold">Sitemap</h2>
        <p className="text-sm text-foreground-muted">
          Generated on every request by <code>app/sitemap.ts</code> from the
          published rows in this database, so it can never fall out of date with
          the content. There is deliberately no &ldquo;regenerate&rdquo; button —
          there is nothing to regenerate.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            View sitemap.xml
          </Link>
          <Link
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            View robots.txt
          </Link>
          <Link
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            View llms.txt
          </Link>
        </div>
      </section>
    </>
  );
}
