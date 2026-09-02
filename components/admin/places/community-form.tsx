"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Save, Trash2 } from "lucide-react";

import {
  createCommunity,
  deleteCommunity,
  saveCommunity,
} from "@/app/(admin)/admin/(shell)/content-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FaqRepeater } from "@/components/admin/faq-repeater";
import { ImageField } from "@/components/admin/image-field";
import { TagInput } from "@/components/admin/tag-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { CommunityInput } from "@/lib/validation/place";
import { slugify } from "@/lib/utils";
import type { City, Community } from "@/types/domain";

/**
 * The community editor — docs/06 § 6.
 *
 * Unlike cities, communities ARE full CRUD: Heathrow is seeded and the client
 * adds the rest herself, which is the whole point of the two-level city →
 * community model in docs/01.
 *
 * Deleting is refused while any listing is still filed under the community.
 * `listings.community_id` is ON DELETE SET NULL, so without that check the
 * listings would quietly lose their community rather than the delete failing.
 */
export function CommunityForm({
  community,
  cities,
  knownAmenities,
}: {
  community: (Community & { published: boolean }) | null;
  cities: City[];
  knownAmenities: string[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [communityId, setCommunityId] = React.useState(community?.id ?? null);
  const [values, setValues] = React.useState<CommunityInput>({
    name: community?.name ?? "",
    slug: community?.slug ?? "",
    cityId: community?.city.id ?? cities[0]?.id ?? "",
    heroKey: community?.heroKey ?? null,
    heroAlt: community?.heroAlt ?? null,
    introMd: community?.introMd ?? null,
    bodyMd: community?.bodyMd ?? null,
    hoaInfo: community?.hoaInfo ?? null,
    amenities: community?.amenities ?? [],
    priceMin: community?.priceRange?.min ?? null,
    priceMax: community?.priceRange?.max ?? null,
    faq: community?.faq ?? [],
    metaTitle: community?.metaTitle ?? null,
    metaDesc: community?.metaDesc ?? null,
    published: community?.published ?? false,
  });
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  function set<K extends keyof CommunityInput>(key: K, value: CommunityInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const errorOf = (key: string) => errors[key]?.[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    // The slug is derived from the name rather than being a field that fails
    // validation on a tab the user never opened.
    const payload = values.slug ? values : { ...values, slug: slugify(values.name) };

    const result = communityId
      ? await saveCommunity(communityId, payload)
      : await createCommunity(payload);

    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }

    setValues(payload);
    toast.success(`${payload.name} saved.`);

    if (!communityId && "data" in result && result.data) {
      const created = result.data as { id: string };
      setCommunityId(created.id);
      router.replace(`/admin/communities/${created.id}/edit`);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 pb-28">
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="faq">Questions</TabsTrigger>
          <TabsTrigger value="seo">SEO &amp; publishing</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <div className="flex max-w-3xl flex-col gap-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field error={errorOf("name")}>
                <FieldLabel required>Name</FieldLabel>
                <Input
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Heathrow"
                />
              </Field>

              <Field error={errorOf("cityId")}>
                <FieldLabel required>City</FieldLabel>
                <Select
                  value={values.cityId}
                  onChange={(event) => set("cityId", event.target.value)}
                >
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <ImageField
              label="Hero image"
              description="A photograph of the community itself — an entrance, a streetscape, the amenity centre."
              entityType="community"
              entityId={communityId}
              imageKey={values.heroKey ?? null}
              alt={values.heroAlt ?? null}
              disabledReason="Save this community once and an image can be added."
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
                placeholder="What this community is actually like to live in."
              />
            </Field>

            <Field error={errorOf("bodyMd")}>
              <FieldLabel>More detail</FieldLabel>
              <Textarea
                rows={12}
                value={values.bodyMd ?? ""}
                onChange={(event) => set("bodyMd", event.target.value)}
              />
              <FieldDescription>
                Markdown works: <code>## Heading</code>, <code>**bold**</code>,{" "}
                <code>- bullet</code>.
              </FieldDescription>
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="flex max-w-3xl flex-col gap-6">
            <Field error={errorOf("hoaInfo")}>
              <FieldLabel>HOA</FieldLabel>
              <Textarea
                rows={4}
                value={values.hoaInfo ?? ""}
                onChange={(event) => set("hoaInfo", event.target.value)}
                placeholder="What the fee covers, roughly what it runs, and how often it is billed."
              />
              <FieldDescription>
                Buyers ask this before almost anything else. Give the real
                figure and the date it was true, not a range.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Amenities</FieldLabel>
              <TagInput
                value={values.amenities}
                onChange={(next) => set("amenities", next)}
                suggestions={knownAmenities}
                max={40}
                placeholder="Type an amenity, then Enter"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field error={errorOf("priceMin")}>
                <FieldLabel>Typical price from</FieldLabel>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={values.priceMin ?? ""}
                  onChange={(event) =>
                    set("priceMin", event.target.value ? Number(event.target.value) : null)
                  }
                />
              </Field>

              <Field error={errorOf("priceMax")}>
                <FieldLabel>Typical price to</FieldLabel>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={values.priceMax ?? ""}
                  onChange={(event) =>
                    set("priceMax", event.target.value ? Number(event.target.value) : null)
                  }
                />
              </Field>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <div className="max-w-3xl">
            <FaqRepeater value={values.faq} onChange={(next) => set("faq", next)} />
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <div className="flex max-w-3xl flex-col gap-5">
            <Field error={errorOf("slug")}>
              <FieldLabel>Web address</FieldLabel>
              <div className="flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3">
                <span className="shrink-0 text-sm text-foreground-subtle">
                  /communities/
                </span>
                <input
                  value={values.slug}
                  onChange={(event) => set("slug", slugify(event.target.value))}
                  placeholder={slugify(values.name)}
                  className="h-11 min-w-0 flex-1 bg-transparent text-body text-foreground focus-visible:outline-none"
                />
              </div>
              <FieldDescription>
                Generated from the name when you first save.
              </FieldDescription>
            </Field>

            <Field error={errorOf("metaDesc")}>
              <FieldLabel>Meta description</FieldLabel>
              <Textarea
                rows={3}
                value={values.metaDesc ?? ""}
                onChange={(event) => set("metaDesc", event.target.value)}
              />
            </Field>

            <SwitchField
              label="Published"
              description="Visible on the public site and listed on the city page."
              checked={values.published}
              onCheckedChange={(checked) => set("published", checked)}
            />

            {communityId ? (
              <div className="border-t border-border pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-bg hover:text-danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete this community
                </Button>
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md safe-bottom md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-foreground-muted">
            {Object.keys(errors).length > 0
              ? "Some fields need attention"
              : communityId
                ? `Editing ${values.name}`
                : "New community"}
          </p>

          {communityId && values.published ? (
            <Button asChild variant="ghost" size="sm">
              <a href={`/communities/${values.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                View
              </a>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/communities")}
          >
            Cancel
          </Button>

          <Button type="submit" variant="accent" size="sm" loading={saving}>
            <Save aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this community"
        description="This cannot be undone."
        confirmPhrase={values.name}
        confirmHint="Type the community name to confirm."
        consequence={
          <>
            Deleting <strong>{values.name}</strong> removes its page and its
            images. If any listings are still filed under it, the delete is
            refused and you will be told how many.
          </>
        }
        onConfirm={async (typed) => {
          if (!communityId) return;
          const result = await deleteCommunity(communityId, typed);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Community deleted.");
          setConfirmDelete(false);
          router.push("/admin/communities");
        }}
      />
    </form>
  );
}
