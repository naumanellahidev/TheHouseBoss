"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { AlertTriangle, ExternalLink, Save, Sparkles } from "lucide-react";

import {
  createListing,
  deleteListingPhotos,
  saveListing,
  suggestSlug,
} from "@/app/(admin)/admin/(shell)/listings/actions";
import { suggestListingSeo } from "@/app/(admin)/admin/(shell)/seo-suggest";
import { TagInput } from "@/components/admin/tag-input";
import { PhotoUploader } from "@/components/admin/listings/photo-uploader";
import { PrePublishChecklist } from "@/components/admin/listings/pre-publish-checklist";
import {
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/form-fields";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useIsCompact } from "@/lib/hooks/use-media-query";
import { canPublish, listingSchema, type ListingInput } from "@/lib/validation/listing";
import { LISTING_TYPES, PROPERTY_TYPES } from "@/lib/validation/search-params";
import { shortAgo } from "@/lib/utils/date";
import { cn, slugify } from "@/lib/utils";
import type { City, Community, Photo } from "@/types/domain";

/**
 * The listing editor — docs/06 § 4.
 *
 * Six sections, tabs at >=768px and an accordion below. Everything the spec
 * calls "editor behavior" is here:
 *
 *   - autosave every 30s and on section change, with a visible "Saved 2 min ago"
 *   - an unsaved-changes guard on navigation
 *   - a sticky footer: Cancel / Save draft / Publish, plus a validation summary
 *   - Cmd/Ctrl+S saves, Cmd/Ctrl+Enter publishes
 *   - the pre-publish checklist gates Publish, and each unmet item jumps to the
 *     section that fixes it
 *
 * Photos are NOT part of the save payload's lifecycle: they upload immediately
 * on selection and are written into form state, so a slow upload never blocks a
 * save (admin-crud skill).
 *
 * On a NEW listing the media section is disabled until the first save. Photo
 * keys are `listings/{listingId}/...` (docs/07 § 3), so there is nowhere to
 * file them until the row exists. The alternative — creating a draft row the
 * moment the page opens — litters the table with abandoned rows every time she
 * clicks "Add listing" and changes her mind.
 */

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "coming_soon", label: "Coming soon" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "off_market", label: "Off market" },
];

const LISTING_TYPE_LABELS: Record<string, string> = {
  resale: "Resale",
  new_construction: "New construction",
  assumable: "Assumable mortgage",
  va_eligible: "VA eligible",
  land: "Land",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: "Single family",
  townhouse: "Townhouse",
  condo: "Condo",
  villa: "Villa",
  multi_family: "Multi-family",
  land: "Land",
  manufactured: "Manufactured",
};

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "details", label: "Details" },
  { id: "media", label: "Media" },
  { id: "content", label: "Content" },
  { id: "seo", label: "SEO" },
  { id: "publish", label: "Publish" },
] as const;

const AUTOSAVE_MS = 30_000;

/**
 * Which section fixes which field, and what to call it.
 *
 * The sticky bar used to say "1 field needs attention" and stop there, which is
 * useless when the offending field sits on a tab you are not looking at. Every
 * error is now named, and the summary jumps to the section that fixes it.
 */
const FIELD_INFO: Record<string, { label: string; tab: string }> = {
  address: { label: "Street address", tab: "basics" },
  unit: { label: "Unit", tab: "basics" },
  zip: { label: "ZIP", tab: "basics" },
  cityId: { label: "City", tab: "basics" },
  communityId: { label: "Community", tab: "basics" },
  price: { label: "Price", tab: "basics" },
  status: { label: "Status", tab: "basics" },
  listingType: { label: "Listing type", tab: "basics" },
  propertyType: { label: "Property type", tab: "basics" },
  lat: { label: "Latitude", tab: "basics" },
  lng: { label: "Longitude", tab: "basics" },
  soldAt: { label: "Sold date", tab: "basics" },
  soldPrice: { label: "Sold price", tab: "basics" },
  beds: { label: "Beds", tab: "details" },
  baths: { label: "Full baths", tab: "details" },
  halfBaths: { label: "Half baths", tab: "details" },
  sqft: { label: "Living area", tab: "details" },
  lotSize: { label: "Lot size", tab: "details" },
  yearBuilt: { label: "Year built", tab: "details" },
  garageSpaces: { label: "Garage spaces", tab: "details" },
  stories: { label: "Stories", tab: "details" },
  hoaFee: { label: "HOA fee", tab: "details" },
  taxesAnnual: { label: "Annual taxes", tab: "details" },
  features: { label: "Features", tab: "details" },
  photos: { label: "Photos", tab: "media" },
  virtualTour: { label: "Virtual tour URL", tab: "media" },
  headline: { label: "Headline", tab: "content" },
  description: { label: "Description", tab: "content" },
  contractorsTake: { label: "Contractor note", tab: "content" },
  slug: { label: "Web address", tab: "seo" },
  metaTitle: { label: "Meta title", tab: "seo" },
  metaDesc: { label: "Meta description", tab: "seo" },
};

export type ListingFormProps = {
  listingId: string | null;
  initial: ListingInput;
  cities: City[];
  communities: Community[];
  knownFeatures: string[];
  /** Only set once the listing has been published at least once. */
  publishedAt?: string | null;
  initialTab?: string;
};

export function ListingForm({
  listingId: initialId,
  initial,
  cities,
  communities,
  knownFeatures,
  publishedAt,
  initialTab,
}: ListingFormProps) {
  const router = useRouter();
  const toast = useToast();
  const isCompact = useIsCompact();

  const [listingId, setListingId] = React.useState(initialId);
  const [section, setSection] = React.useState<string>(
    SECTIONS.some((s) => s.id === initialTab) ? initialTab! : "basics",
  );
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const photoSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = React.useState<false | "draft" | "publish">(false);

  const form = useForm<ListingInput>({
    // listingSchema carries three .refine() rules, which makes its zod input
    // type differ from its output type (defaults applied, soldAt coerced).
    // react-hook-form then cannot reconcile the two through one generic.
    //
    // The cast is safe and deliberate: `initial` is always a COMPLETE
    // ListingInput — both the new-listing page and the edit page build one —
    // so the form's values genuinely are that type from the first render. The
    // resolver still runs the real schema, so validation is unchanged; only
    // the compile-time shape is pinned to the output side.
    resolver: zodResolver(listingSchema) as unknown as Resolver<ListingInput>,
    defaultValues: initial as never,
    mode: "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
    setValue,
    reset,
  } = form;

  const values = useWatch({ control }) as ListingInput;
  const errorOf = (name: keyof ListingInput) =>
    (errors[name]?.message as string | undefined) ?? undefined;

  const selectedCity = cities.find((city) => city.id === values.cityId);
  const cityCommunities = communities.filter(
    (community) => community.city.id === values.cityId,
  );

  /* ── Save ────────────────────────────────────────────────────────────── */

  /**
   * Saves are strictly ordered by the order they were STARTED.
   *
   * Without this, an autosave that began mid-upload could land after the
   * explicit save that followed it and overwrite the newer photo array with
   * its own stale one — which is exactly what happened: 15 photos uploaded,
   * an autosave fired at the 30-second mark with 8 of them, and the row ended
   * up with 8. Chaining every write onto the previous one makes last-called
   * genuinely last-written.
   */
  const saveChain = React.useRef<Promise<unknown>>(Promise.resolve());

  const persist = React.useCallback(
    async (payload: ListingInput, mode: "draft" | "publish" | "auto") => {
      if (mode !== "auto") setSaving(mode === "publish" ? "publish" : "draft");

      // Wait for any write already in flight, then take the lock.
      const previous = saveChain.current;
      let release: () => void = () => {};
      saveChain.current = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous.catch(() => {});

      let result;
      try {
        result = listingId
          ? await saveListing(listingId, payload)
          : await createListing(payload);
      } finally {
        release();
      }

      setSaving(false);

      if (!result.ok) {
        // An autosave failure is still a failure the user has to know about
        // (admin UX rule 2: never a silent failure). It gets a quieter message
        // than an explicit save, but it is never swallowed — a form that has
        // silently stopped saving is the worst outcome on this screen.
        toast.error(
          mode === "auto"
            ? `Autosave failed. ${result.error} Your changes are still on screen.`
            : result.error,
        );
        return false;
      }

      // Re-baseline so isDirty is false and the navigation guard stops warning.
      reset(payload, { keepValues: true });
      setSavedAt(new Date());

      if (!listingId && "data" in result && result.data && "id" in result.data) {
        const created = result.data as { id: string; slug: string };
        setListingId(created.id);
        // replace, not push: the "new" URL must not stay in history, or Back
        // lands on a form that would create a second listing.
        router.replace(`/admin/listings/${created.id}/edit`);
      }

      if (mode !== "auto") {
        toast.success(
          mode === "publish" ? "Listing published." : "Draft saved.",
        );
      }
      return true;
    },
    [listingId, reset, router, toast],
  );

  /**
   * Autosave.
   *
   * Only ever saves a DRAFT, and only when the form is dirty and already valid.
   * Autosaving an invalid form would either write a half-listing or fire a
   * toast every 30 seconds while she is mid-sentence; both are worse than
   * waiting for the field to be finished.
   */
  React.useEffect(() => {
    if (!listingId) return;
    const timer = setInterval(() => {
      if (!isDirty || saving) return;
      const current = getValues();
      if (!listingSchema.safeParse(current).success) return;
      void persist({ ...current, published: current.published }, "auto");
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [listingId, isDirty, saving, getValues, persist]);

  /** Save on section change, as the spec requires. */
  function goToSection(next: string) {
    setSection(next);
    if (!listingId || !isDirty) return;
    const current = getValues();
    if (listingSchema.safeParse(current).success) void persist(current, "auto");
  }

  React.useEffect(
    () => () => {
      if (photoSaveTimer.current) clearTimeout(photoSaveTimer.current);
    },
    [],
  );

  /* ── Unsaved-changes guard ───────────────────────────────────────────── */

  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ── Keyboard shortcuts (docs/06 § 11 rule 7) ────────────────────────── */

  // The listener binds once. The ref is written in an effect, never during
  // render, and keeps the handler pointed at the current submit closure.
  const submitRef = React.useRef<(mode: "draft" | "publish") => () => Promise<void>>(
    () => async () => {},
  );
  React.useEffect(() => {
    submitRef.current = submit;
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;

      if (event.key === "s") {
        event.preventDefault();
        void submitRef.current("draft")();
      }
      if (event.key === "Enter" && canPublish(getValues())) {
        event.preventDefault();
        void submitRef.current("publish")();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [getValues]);

  /* ── Slug ────────────────────────────────────────────────────────────── */

  /**
   * The slug is DERIVED, not typed. docs/06 § 4 Tab 5 calls it "auto-generated
   * from address + city, editable", so an empty one is filled in here rather
   * than failing validation on a tab the user has never opened — which is
   * exactly what the first end-to-end run hit.
   */
  const ensureSlug = React.useCallback(async () => {
    const current = getValues("slug");
    if (current && current.trim().length >= 3) return;

    const address = getValues("address");
    const city = cities.find((c) => c.id === getValues("cityId"));
    if (!address || !city) return;

    const slug = await suggestSlug(address, city.name, listingId ?? undefined);
    setValue("slug", slug, { shouldDirty: true, shouldValidate: true });
  }, [cities, getValues, listingId, setValue]);

  /**
   * Save and Publish both go through here, so neither can skip the slug.
   *
   * A hoisted declaration rather than a useCallback: it is referenced by the
   * keyboard-shortcut effect declared above it, and it returns a new function
   * on every call, which is the one shape useCallback cannot usefully memoize.
   */
  function submit(mode: "draft" | "publish") {
    return async () => {
      await ensureSlug();
      await handleSubmit((payload) =>
        persist(mode === "publish" ? { ...payload, published: true } : payload, mode),
      )();
    };
  }

  const [writingSeo, setWritingSeo] = React.useState(false);

  /*
    "Write it for me" — the SEO tab's own generate button.

    Fills the two fields from the listing's facts and stops there. It does NOT
    save and it does NOT touch `seo_pages`: publishing already writes generated
    metadata for every listing, so this is a preview of what that will say,
    offered early enough to edit. Marking the form dirty is deliberate — the
    text is now the admin's to keep or clear, and autosave should treat it so.
  */
  async function writeSeo() {
    setWritingSeo(true);
    const v = getValues();

    const result = await suggestListingSeo({
      address: v.address ?? "",
      cityName: selectedCity?.name ?? "",
      status: v.status ?? "active",
      price: v.price ?? null,
      soldPrice: v.soldPrice ?? null,
      beds: v.beds ?? null,
      baths: v.baths ?? null,
      sqft: v.sqft ?? null,
      yearBuilt: v.yearBuilt ?? null,
      pool: Boolean(v.pool),
      contractorsTake: v.contractorsTake ?? null,
    });
    setWritingSeo(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setValue("metaTitle", result.title, { shouldDirty: true, shouldValidate: true });
    setValue("metaDesc", result.description, {
      shouldDirty: true,
      shouldValidate: true,
    });
    toast.success(
      result.usedModel
        ? "Written and polished. Every number came from this listing."
        : "Written from this listing's own details.",
    );
  }

  async function regenerateSlug() {
    const address = getValues("address");
    if (!address || !selectedCity) {
      toast.error("Add the address and the city first.");
      return;
    }
    const slug = await suggestSlug(address, selectedCity.name, listingId ?? undefined);
    setValue("slug", slug, { shouldDirty: true, shouldValidate: true });
  }

  /* ── Photos ──────────────────────────────────────────────────────────── */

  const photos = (values.photos ?? []) as Photo[];

  function setPhotos(next: Photo[]) {
    setValue("photos", next, { shouldDirty: true, shouldValidate: true });
  }

  /**
   * Appends against the LIVE value, not a captured render.
   *
   * Uploads finish one at a time; reading `values.photos` here would append
   * every one of them to the same stale array.
   *
   * The append is then persisted on a short debounce rather than waiting for
   * the 30-second autosave. A photo that exists in storage but not yet in the
   * listing row is an orphan until the next save — harmless (the nightly sweep
   * reclaims it) but wasteful, and it means closing the tab straight after an
   * upload loses the photo from the listing. A burst of fifteen uploads
   * collapses into one write.
   */
  function appendPhoto(photo: Photo) {
    const current = (getValues("photos") ?? []) as Photo[];
    setValue("photos", [...current, photo], {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (photoSaveTimer.current) clearTimeout(photoSaveTimer.current);
    photoSaveTimer.current = setTimeout(() => {
      const next = getValues();
      if (listingSchema.safeParse(next).success) void persist(next, "auto");
    }, 1500);
  }

  function removePhotoKeys(keys: string[]) {
    if (!listingId) return;
    // Fire and forget: the objects are already gone from form state, and the
    // orphan cron is the backstop if this request fails.
    void deleteListingPhotos(listingId, keys).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  /* ── Sections ────────────────────────────────────────────────────────── */

  const sectionContent: Record<string, React.ReactNode> = {
    basics: (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            name="address"
            label="Street address"
            required
            register={register}
            error={errorOf("address")}
            autoComplete="off"
            className="md:col-span-2"
          />
          <TextField
            name="unit"
            label="Unit"
            register={register}
            error={errorOf("unit")}
            placeholder="Apt 4B"
          />
          <TextField
            name="zip"
            label="ZIP"
            register={register}
            error={errorOf("zip")}
            inputMode="numeric"
            placeholder="32746"
          />
          <SelectField
            name="cityId"
            label="City"
            required
            register={register}
            error={errorOf("cityId")}
            placeholder="Choose a city"
            options={cities.map((city) => ({ value: city.id, label: city.name }))}
          />
          <SelectField
            name="communityId"
            label="Community"
            register={register}
            error={errorOf("communityId")}
            placeholder={
              cityCommunities.length > 0 ? "None" : "No communities in this city yet"
            }
            options={cityCommunities.map((community) => ({
              value: community.id,
              label: community.name,
            }))}
            description="Optional. Links this listing to a community page."
          />
          <NumberField
            name="price"
            label="Price"
            required
            control={control}
            error={errorOf("price")}
            prefix="$"
            min={0}
            step={1000}
          />
          <SelectField
            name="status"
            label="Status"
            required
            register={register}
            error={errorOf("status")}
            options={STATUS_OPTIONS}
          />
          <SelectField
            name="listingType"
            label="Listing type"
            required
            register={register}
            error={errorOf("listingType")}
            options={LISTING_TYPES.map((type) => ({
              value: type,
              label: LISTING_TYPE_LABELS[type] ?? type,
            }))}
          />
          <SelectField
            name="propertyType"
            label="Property type"
            required
            register={register}
            error={errorOf("propertyType")}
            options={PROPERTY_TYPES.map((type) => ({
              value: type,
              label: PROPERTY_TYPE_LABELS[type] ?? type,
            }))}
          />
          <NumberField
            name="lat"
            label="Latitude"
            control={control}
            error={errorOf("lat")}
            step="0.000001"
          />
          <NumberField
            name="lng"
            label="Longitude"
            control={control}
            error={errorOf("lng")}
            step="0.000001"
            description="Without coordinates the map block on the listing page does not render."
          />
        </div>

        {/* Sold flow — docs/06 § 4, Tab 1. The note is plain language on
            purpose: the client needs to understand that the PAGE survives. */}
        {values.status === "sold" ? (
          <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface-sunken p-5">
            <p className="flex items-start gap-2.5 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                Large photos will be deleted 7 days after the sold date. The page
                stays live, keeps its search ranking, and keeps a small version of
                every photo.
              </span>
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <Field error={errorOf("soldAt")}>
                <FieldLabel required>Sold date</FieldLabel>
                <input
                  type="date"
                  {...register("soldAt", {
                    setValueAs: (value) => (value ? new Date(value) : null),
                  })}
                  className={cn(
                    "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                />
              </Field>
              <NumberField
                name="soldPrice"
                label="Sold price"
                required
                control={control}
                error={errorOf("soldPrice")}
                prefix="$"
                min={0}
                step={1000}
              />
            </div>

            <SwitchField
              label="Keep photos permanently"
              description="Turn this on for a portfolio listing you want to keep full-size photos of. It opts this listing out of the storage purge entirely."
              checked={Boolean(values.keepPhotos)}
              onCheckedChange={(checked) =>
                setValue("keepPhotos", checked, { shouldDirty: true })
              }
            />
          </div>
        ) : null}
      </div>
    ),

    details: (
      <div className="flex flex-col gap-6">
        <div className="grid gap-5 md:grid-cols-3">
          <NumberField name="beds" label="Beds" control={control} error={errorOf("beds")} min={0} />
          <NumberField
            name="baths"
            label="Full baths"
            control={control}
            error={errorOf("baths")}
            min={0}
            step={0.5}
          />
          <NumberField
            name="halfBaths"
            label="Half baths"
            control={control}
            error={errorOf("halfBaths")}
            min={0}
          />
          <NumberField
            name="sqft"
            label="Living area"
            control={control}
            error={errorOf("sqft")}
            suffix="sq ft"
            min={0}
          />
          <NumberField
            name="lotSize"
            label="Lot size"
            control={control}
            error={errorOf("lotSize")}
            suffix="acres"
            min={0}
            step={0.01}
          />
          <NumberField
            name="yearBuilt"
            label="Year built"
            control={control}
            error={errorOf("yearBuilt")}
            min={1800}
            max={2100}
          />
          <NumberField
            name="garageSpaces"
            label="Garage spaces"
            control={control}
            error={errorOf("garageSpaces")}
            min={0}
          />
          <NumberField
            name="stories"
            label="Stories"
            control={control}
            error={errorOf("stories")}
            min={0}
          />
          <NumberField
            name="hoaFee"
            label="HOA fee"
            control={control}
            error={errorOf("hoaFee")}
            prefix="$"
            suffix="/mo"
            min={0}
          />
          <NumberField
            name="taxesAnnual"
            label="Annual taxes"
            control={control}
            error={errorOf("taxesAnnual")}
            prefix="$"
            min={0}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SwitchField
            label="Pool"
            checked={Boolean(values.pool)}
            onCheckedChange={(checked) => setValue("pool", checked, { shouldDirty: true })}
          />
          <SwitchField
            label="Waterfront"
            checked={Boolean(values.waterfront)}
            onCheckedChange={(checked) =>
              setValue("waterfront", checked, { shouldDirty: true })
            }
          />
        </div>

        <Field error={errorOf("features")}>
          <FieldLabel>Features</FieldLabel>
          <TagInput
            value={values.features ?? []}
            onChange={(next) => setValue("features", next, { shouldDirty: true })}
            suggestions={knownFeatures}
            placeholder="Type a feature, then Enter"
          />
          <FieldDescription>
            Suggestions come from features you have used before. Reusing the same
            wording is what lets the site group and filter them.
          </FieldDescription>
        </Field>
      </div>
    ),

    media: (
      <div className="flex flex-col gap-6">
        <PhotoUploader
          listingId={listingId}
          photos={photos}
          onChange={setPhotos}
          onAppend={appendPhoto}
          onDeleteKeys={removePhotoKeys}
          disabled={!listingId}
          disabledReason="Save this listing once and photos can be added — they are filed under the listing, so it has to exist first."
        />

        <TextField
          name="virtualTour"
          label="Virtual tour URL"
          register={register}
          error={errorOf("virtualTour")}
          placeholder="https://my.matterport.com/show/?m=…"
          description="Optional. Shown as a button on the listing page."
        />
      </div>
    ),

    content: (
      <div className="flex flex-col gap-5">
        <TextField
          name="headline"
          label="Headline"
          register={register}
          error={errorOf("headline")}
          maxLength={90}
          description={`${(values.headline ?? "").length} / 90 characters`}
          placeholder="Updated Heathrow pool home on a conservation lot"
        />

        <TextareaField
          name="description"
          label="Description"
          register={register}
          error={errorOf("description")}
          rows={10}
          currentLength={(values.description ?? "").length}
          description="Describe the property, never the ideal occupant — that is a Fair Housing requirement, not a style note."
        />

        <TextareaField
          name="contractorsTake"
          label="The Contractor's Take"
          register={register}
          error={errorOf("contractorsTake")}
          rows={6}
          description="Your construction read on this property — roof age, what the sub-panel looks like, what a remodel would realistically cost. This is what no other agent's listing has. Optional, and shown as its own callout."
        />
      </div>
    ),

    seo: (
      <div className="flex flex-col gap-5">
        <Field error={errorOf("slug")}>
          <FieldLabel required>Web address</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-1 rounded-md border border-border-strong bg-surface px-3">
              <span className="shrink-0 text-sm text-foreground-subtle">/listing/</span>
              <input
                {...register("slug", { setValueAs: (value) => slugify(String(value)) })}
                className="h-11 min-w-0 flex-1 bg-transparent text-body text-foreground focus-visible:outline-none"
              />
            </div>
            <Button type="button" variant="outline" onClick={regenerateSlug}>
              Generate from address
            </Button>
          </div>
          <FieldDescription>
            {publishedAt
              ? "This listing is already published. Changing the address creates a permanent redirect from the old one automatically, so no link ever breaks."
              : "Generated from the address and city. Lowercase words separated by hyphens."}
          </FieldDescription>
        </Field>

        {/*
          The generate button sits ABOVE both fields, not beside one of them.
          It writes both, and a control that changes two fields should not look
          like it belongs to the first.
        */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-sunken p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[60ch] text-sm text-foreground-muted">
              You do not have to fill these in. When you publish, a title and
              description are written from this listing&rsquo;s own details. Use
              the button to see what that will say, and edit it if you want
              something different.
            </p>
            <Button
              type="button"
              variant="outline"
              loading={writingSeo}
              onClick={writeSeo}
            >
              <Sparkles aria-hidden="true" />
              Write it for me
            </Button>
          </div>
        </div>

        <TextField
          name="metaTitle"
          label="Meta title"
          register={register}
          error={errorOf("metaTitle")}
          description={`${(values.metaTitle ?? "").length} / 60 is the practical limit before search results truncate it.`}
        />

        <TextareaField
          name="metaDesc"
          label="Meta description"
          register={register}
          error={errorOf("metaDesc")}
          rows={3}
          maxLength={155}
          currentLength={(values.metaDesc ?? "").length}
          description="Optional. Leave it blank and one is written for you when you publish, from this listing's own facts. Type here only to override that — and give it at least 140 characters, or it is regenerated anyway."
        />

        {/* Search-result preview. Shows what the page will actually look like
            in a result, which is far more useful than two character counters. */}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-sunken p-4">
          <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
            Search result preview
          </p>
          <p className="truncate text-xs text-foreground-muted">
            thehousebossfl.com › listing › {values.slug || "…"}
          </p>
          <p className="line-clamp-1 text-lead font-medium text-info">
            {values.metaTitle?.trim() ||
              `${values.address || "Address"}, ${selectedCity?.name ?? "City"}, FL`}
          </p>
          <p className="line-clamp-2 text-sm text-foreground-muted">
            {values.metaDesc?.trim() ||
              values.description?.trim().slice(0, 155) ||
              "Written for you on publish, from the address, price and specs above."}
          </p>
        </div>
      </div>
    ),

    publish: (
      <div className="flex flex-col gap-6">
        <PrePublishChecklist values={values} onGoToTab={goToSection} />

        <div className="grid gap-3 md:grid-cols-2">
          <SwitchField
            label="Featured"
            description="Featured listings appear on the home page. The section hides itself if there are fewer than three."
            checked={Boolean(values.isFeatured)}
            onCheckedChange={(checked) =>
              setValue("isFeatured", checked, { shouldDirty: true })
            }
          />
          <SwitchField
            label="Published"
            description="Visible on the public site. Unpublishing hides the page but keeps the URL reserved."
            checked={Boolean(values.published)}
            disabled={!canPublish(values) && !values.published}
            onCheckedChange={(checked) =>
              setValue("published", checked, { shouldDirty: true })
            }
          />
        </div>

        {publishedAt ? (
          <p className="text-sm text-foreground-muted">
            First published {new Date(publishedAt).toLocaleDateString("en-US")}. That
            date is stamped once and never moves.
          </p>
        ) : null}
      </div>
    ),
  };

  /* ── Validation summary for the sticky bar ───────────────────────────── */

  const errorFields = Object.keys(errors);
  const firstErrorTab = FIELD_INFO[errorFields[0] ?? ""]?.tab;
  const errorNames = errorFields
    .map((name) => FIELD_INFO[name]?.label ?? name)
    .slice(0, 3)
    .join(", ");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitRef.current("draft")();
      }}
      className="flex flex-col gap-6 pb-32"
    >
      {isCompact ? (
        <Accordion
          type="single"
          collapsible
          value={section}
          onValueChange={(next) => next && goToSection(next)}
          className="w-full border-t border-border"
        >
          {SECTIONS.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{item.label}</AccordionTrigger>
              <AccordionContent>{sectionContent[item.id]}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Tabs value={section} onValueChange={goToSection}>
          <TabsList>
            {SECTIONS.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SECTIONS.map((item) => (
            <TabsContent key={item.id} value={item.id}>
              {sectionContent[item.id]}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* ── Sticky action bar ──────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md safe-bottom md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-foreground-muted" aria-live="polite">
            {saving ? (
              "Saving…"
            ) : errorFields.length > 0 ? (
              <button
                type="button"
                onClick={() => firstErrorTab && goToSection(firstErrorTab)}
                className="rounded-sm text-left font-medium text-danger underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Needs attention: {errorNames}
                {errorFields.length > 3 ? ` and ${errorFields.length - 3} more` : ""}
              </button>
            ) : savedAt ? (
              `Saved ${shortAgo(savedAt)}`
            ) : isDirty ? (
              "Unsaved changes"
            ) : (
              "No changes"
            )}
          </p>

          {listingId && values.published ? (
            <Button asChild variant="ghost" size="sm">
              <a href={`/listing/${values.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                View
              </a>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/listings")}
          >
            Cancel
          </Button>

          <Button type="submit" variant="outline" size="sm" loading={saving === "draft"}>
            <Save aria-hidden="true" />
            Save draft
          </Button>

          <Button
            type="button"
            variant="accent"
            size="sm"
            loading={saving === "publish"}
            disabled={!canPublish(values)}
            onClick={submit("publish")}
          >
            {values.published ? "Save & keep live" : "Publish"}
          </Button>
        </div>
      </div>
    </form>
  );
}
