"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Save } from "lucide-react";

import { saveCity } from "@/app/(admin)/admin/(shell)/content-actions";
import { CityStatsForm } from "@/components/admin/city-stats-form";
import { FaqRepeater } from "@/components/admin/faq-repeater";
import { ImageField } from "@/components/admin/image-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { CityInput } from "@/lib/validation/place";
import type { City } from "@/types/domain";

/**
 * The city editor — docs/06 § 6.
 *
 * Cities are seeded and rarely added, so this is a content editor rather than
 * full CRUD: no create, no delete. Deleting a city would orphan every listing
 * filed under it, and `listings.city_id` is ON DELETE RESTRICT precisely so
 * that cannot happen by accident.
 *
 * `is_flagship` is not editable. Lake Mary is the flagship because it has a
 * literal route with sub-routes the other cities do not have (docs/01); making
 * it a toggle would imply the routing follows the flag, and it does not.
 */
export function CityForm({ city }: { city: City & { published: boolean } }) {
  const router = useRouter();
  const toast = useToast();

  const [values, setValues] = React.useState<CityInput>({
    name: city.name,
    slug: city.slug,
    county: city.county,
    inSearch: city.inSearch,
    heroKey: city.heroKey,
    heroAlt: city.heroAlt,
    introMd: city.introMd,
    bodyMd: city.bodyMd,
    stats: city.stats,
    faq: city.faq,
    metaTitle: city.metaTitle,
    metaDesc: city.metaDesc,
    published: city.published,
  });
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  function set<K extends keyof CityInput>(key: K, value: CityInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const errorOf = (key: string) => errors[key]?.[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const result = await saveCity(city.id, values);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }

    toast.success(`${values.name} saved.`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 pb-28">
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="faq">Questions</TabsTrigger>
          <TabsTrigger value="seo">SEO &amp; publishing</TabsTrigger>
        </TabsList>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <TabsContent value="content">
          <div className="flex max-w-3xl flex-col gap-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field error={errorOf("name")}>
                <FieldLabel required>Name</FieldLabel>
                <Input
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>

              <Field error={errorOf("county")}>
                <FieldLabel required>County</FieldLabel>
                <Input
                  value={values.county}
                  onChange={(event) => set("county", event.target.value)}
                />
              </Field>
            </div>

            <ImageField
              label="Hero image"
              description="The photograph at the top of the city page. A real local photograph is worth far more here than a stock skyline."
              entityType="city"
              entityId={city.id}
              imageKey={values.heroKey ?? null}
              alt={values.heroAlt ?? null}
              onChange={({ key, alt }) =>
                setValues((current) => ({ ...current, heroKey: key, heroAlt: alt }))
              }
            />
            {errorOf("heroAlt") ? (
              <p className="-mt-3 text-xs font-medium text-danger">
                {errorOf("heroAlt")}
              </p>
            ) : null}

            <Field error={errorOf("introMd")}>
              <FieldLabel>Introduction</FieldLabel>
              <Textarea
                rows={5}
                value={values.introMd ?? ""}
                onChange={(event) => set("introMd", event.target.value)}
                placeholder="Why someone would want to live here, in your own words."
              />
              <FieldDescription>
                The first two paragraphs appear on the homes-for-sale page as
                well. Write it first-person — this is the part that sounds like
                you rather than like a brochure.
              </FieldDescription>
            </Field>

            <Field error={errorOf("bodyMd")}>
              <FieldLabel>Living here</FieldLabel>
              <Textarea
                rows={14}
                value={values.bodyMd ?? ""}
                onChange={(event) => set("bodyMd", event.target.value)}
                placeholder={"## Schools\n\n…\n\n## Getting around\n\n…"}
              />
              <FieldDescription>
                Schools, commute, parks, dining, events. Markdown works:{" "}
                <code>## Heading</code>, <code>**bold**</code>,{" "}
                <code>- bullet</code>, <code>[link](https://…)</code>.
              </FieldDescription>
            </Field>
          </div>
        </TabsContent>

        {/* ── Statistics ───────────────────────────────────────────────── */}
        <TabsContent value="stats">
          <div className="max-w-3xl">
            <CityStatsForm
              value={values.stats}
              onChange={(next) => set("stats", next)}
              error={errorOf("stats")}
            />
          </div>
        </TabsContent>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <TabsContent value="faq">
          <div className="max-w-3xl">
            <FaqRepeater value={values.faq} onChange={(next) => set("faq", next)} />
          </div>
        </TabsContent>

        {/* ── SEO and publishing ───────────────────────────────────────── */}
        <TabsContent value="seo">
          <div className="flex max-w-3xl flex-col gap-5">
            <Field error={errorOf("slug")}>
              <FieldLabel required>Web address</FieldLabel>
              <div className="flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3">
                <span className="shrink-0 text-sm text-foreground-subtle">/</span>
                <input
                  value={values.slug}
                  onChange={(event) => set("slug", event.target.value)}
                  className="h-11 min-w-0 flex-1 bg-transparent text-body text-foreground focus-visible:outline-none"
                />
              </div>
              <FieldDescription>
                Changing this changes the address of the city page AND its
                homes-for-sale page. Both are linked from elsewhere on the site —
                only change it if it is wrong.
              </FieldDescription>
            </Field>

            <Field error={errorOf("metaTitle")}>
              <FieldLabel>Meta title</FieldLabel>
              <Input
                value={values.metaTitle ?? ""}
                onChange={(event) => set("metaTitle", event.target.value)}
                placeholder={`${values.name}, FL Real Estate`}
              />
            </Field>

            <Field error={errorOf("metaDesc")}>
              <FieldLabel>Meta description</FieldLabel>
              <Textarea
                rows={3}
                value={values.metaDesc ?? ""}
                onChange={(event) => set("metaDesc", event.target.value)}
              />
              <FieldDescription>
                <span className="tabular">{(values.metaDesc ?? "").length}</span> / 155
              </FieldDescription>
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <SwitchField
                label="Show in the search filter"
                description="The five cities she actively works appear in the city filter on the search page. The others still get a page."
                checked={values.inSearch}
                onCheckedChange={(checked) => set("inSearch", checked)}
              />
              <SwitchField
                label="Published"
                description="Unpublishing hides the city page and its homes-for-sale page from visitors."
                checked={values.published}
                onCheckedChange={(checked) => set("published", checked)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md safe-bottom md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-foreground-muted">
            {Object.keys(errors).length > 0
              ? "Some fields need attention"
              : `Editing ${values.name}`}
          </p>

          <Button asChild variant="ghost" size="sm">
            <a href={`/${city.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              View
            </a>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/cities")}
          >
            Cancel
          </Button>

          <Button type="submit" variant="accent" size="sm" loading={saving}>
            <Save aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
