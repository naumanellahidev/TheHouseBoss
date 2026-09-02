import Link from "next/link";
import { MapPinned, Pencil, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { getAdminCommunities } from "@/lib/queries/admin";

export const metadata = { title: "Communities" };

export default async function AdminCommunitiesPage() {
  const communities = await getAdminCommunities();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Communities"
        description="Named neighbourhoods and subdivisions inside a city. Each gets its own page, and a listing can be filed under one."
        actions={
          <Button asChild variant="accent">
            <Link href="/admin/communities/new">
              <Plus aria-hidden="true" />
              Add a community
            </Link>
          </Button>
        }
      />

      {communities.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Add your first community"
          description="Heathrow, Alaqua, Magnolia Plantation — the names buyers actually search for. A community page ranks for queries a city page never will."
          actions={
            <Button asChild variant="accent">
              <Link href="/admin/communities/new">Add a community</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {communities.map((community) => (
            <li key={community.id}>
              <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-h4 font-semibold text-foreground">
                    {community.name}
                  </h3>
                  <Badge tone={community.published ? "active" : "neutral"}>
                    {community.published ? "Live" : "Draft"}
                  </Badge>
                </div>

                <p className="text-xs text-foreground-subtle">
                  {community.city.name} · /communities/{community.slug}
                </p>

                <p className="text-xs text-foreground-muted">
                  {community.amenities.length} amenities · {community.faq.length}{" "}
                  questions
                </p>

                <div className="mt-auto flex gap-2 border-t border-border pt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/communities/${community.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>
                  {community.published ? (
                    <Button asChild variant="ghost" size="sm">
                      <a
                        href={`/communities/${community.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
