import Link from "next/link";
import { Pencil } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminCities } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cities" };

/**
 * Cities — docs/06 § 6.
 *
 * A list and an editor, with no create and no delete. Cities are seeded and
 * rarely added, and deleting one would strand every listing filed under it
 * (`listings.city_id` is ON DELETE RESTRICT, so the database would refuse
 * anyway — this just does not offer the button).
 */
export default async function AdminCitiesPage() {
  const cities = await getAdminCities();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Cities"
        description="Each of these has a page of its own and a homes-for-sale page. The ones marked as search cities also appear in the search filter."
      />

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cities.map((city) => {
          const thin = (city.introMd?.length ?? 0) < 200;
          return (
            <li key={city.id}>
              <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-h4 font-semibold text-foreground">{city.name}</h3>
                  {city.isFlagship ? <Badge tone="accent">Flagship</Badge> : null}
                  {city.inSearch ? <Badge tone="outline">In search</Badge> : null}
                </div>

                <p className="text-xs text-foreground-subtle">
                  {city.county} County · /{city.slug}
                </p>

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                  <div className="flex gap-1.5">
                    <dt>Intro</dt>
                    <dd className={cn("font-medium", thin ? "text-warning" : "text-foreground")}>
                      {city.introMd?.length ?? 0} chars
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Questions</dt>
                    <dd className="font-medium text-foreground tabular">{city.faq.length}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Statistics</dt>
                    <dd className="font-medium text-foreground">
                      {city.stats.asOf ? `as of ${city.stats.asOf}` : "none"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex gap-2 border-t border-border pt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/cities/${city.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/${city.slug}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
