import { z } from "zod";

import { LISTING_TYPES, PROPERTY_TYPES } from "@/lib/validation/search-params";

/**
 * ONE schema, shared by the admin form (react-hook-form + zodResolver) and by
 * the server action that writes the row. CLAUDE.md § 5: never validate in only
 * one place.
 *
 * These rules are stated three times on purpose — here, in the uploader UI, and
 * as Postgres CHECK constraints. All three layers must agree; the database is
 * the one that cannot be bypassed.
 */

export const MAX_PHOTOS = 15;

/**
 * A URL field that is genuinely optional.
 *
 * `z.string().url()` rejects `""`, and an HTML input that has never been typed
 * in posts `""` — so a field labelled "Optional. Shown as a button on the
 * listing page." showed "Invalid URL" the moment the form validated, and
 * blocked the save. The field was optional in intent and mandatory in effect.
 *
 * The empty string is normalised to `null` BEFORE the URL check runs, which is
 * the only ordering that works: a `.optional()` after `.url()` never sees the
 * value, because the URL check has already failed.
 *
 * `preprocess` and not `transform` for the same reason — transform runs after
 * validation.
 */
/**
 * Optional free text: a blank input becomes NULL, not `""`.
 *
 * Same root cause as `optionalUrl` — an untouched input posts an empty string —
 * with two consequences. A field with a format rule (`zip`, five digits)
 * rejected blank outright and blocked the save. A field without one stored `""`,
 * which reads as "the agent deliberately set this to nothing" when it means
 * "never filled in", and which the SEO generator then has to treat as a value.
 */
const optionalText = (schema: z.ZodType<string>) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema.nullable(),
  );

const optionalUrl = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().url("Enter a full address starting with https://").max(max).nullable(),
  );

export const storedPhotoSchema = z.object({
  kind: z.literal("stored"),
  /** Immutable key from nanoid(). No size suffix, no extension (HR1, HR4). */
  key: z.string().min(3).max(200).regex(/^[a-z0-9/_-]+$/i),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  alt: z.string().trim().max(300),
  blur: z.string().startsWith("data:image/").max(4000).optional(),
  order: z.number().int().min(0).max(MAX_PHOTOS).optional(),
});

/** Future MLS hotlinks, and the local placeholder used by the dev seed. */
export const externalPhotoSchema = z.object({
  kind: z.literal("external"),
  url: z.string().min(1).max(1000),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  alt: z.string().trim().max(300),
  order: z.number().int().min(0).max(MAX_PHOTOS).optional(),
});

export const photoSchema = z.discriminatedUnion("kind", [
  storedPhotoSchema,
  externalPhotoSchema,
]);

export const LISTING_STATUSES = [
  "active",
  "pending",
  "sold",
  "coming_soon",
  "off_market",
] as const;

export const listingSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words separated by hyphens"),

    status: z.enum(LISTING_STATUSES),
    listingType: z.enum(LISTING_TYPES),
    propertyType: z.enum(PROPERTY_TYPES),

    price: z.number().nonnegative().max(100_000_000),
    hoaFee: z.number().nonnegative().max(100_000).nullable().optional(),
    taxesAnnual: z.number().nonnegative().max(1_000_000).nullable().optional(),

    beds: z.number().int().min(0).max(20).nullable().optional(),
    baths: z.number().min(0).max(20).step(0.5).nullable().optional(),
    halfBaths: z.number().int().min(0).max(10).default(0),
    sqft: z.number().int().min(0).max(100_000).nullable().optional(),
    lotSize: z.number().min(0).max(10_000).nullable().optional(),
    yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
    garageSpaces: z.number().int().min(0).max(20).default(0),
    stories: z.number().int().min(0).max(10).nullable().optional(),
    pool: z.boolean().default(false),
    waterfront: z.boolean().default(false),
    features: z.array(z.string().trim().min(1).max(60)).max(60).default([]),

    address: z.string().trim().min(3).max(200),
    unit: optionalText(z.string().trim().max(30)).optional(),
    cityId: z.string().uuid(),
    communityId: z.string().uuid().nullable().optional(),
    zip: optionalText(
      z.string().trim().regex(/^\d{5}$/, "Five digits, e.g. 32746"),
    ).optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),

    headline: optionalText(z.string().trim().max(90)).optional(),
    description: optionalText(z.string().trim().max(20_000)).optional(),
    contractorsTake: optionalText(z.string().trim().max(5000)).optional(),
    photos: z.array(photoSchema).max(MAX_PHOTOS),
    virtualTour: optionalUrl(500).optional(),

    metaTitle: optionalText(z.string().trim().max(70)).optional(),
    metaDesc: optionalText(z.string().trim().max(180)).optional(),

    isFeatured: z.boolean().default(false),
    published: z.boolean().default(false),
    soldAt: z.coerce.date().nullable().optional(),
    soldPrice: z.number().nonnegative().max(100_000_000).nullable().optional(),
    keepPhotos: z.boolean().default(false),
  })
  // Mirrors listings_sold_fields
  .refine(
    (v) => v.status !== "sold" || (v.soldAt != null && v.soldPrice != null),
    { message: "A sold listing needs a sold date and a sold price.", path: ["soldAt"] },
  )
  // Mirrors listings_published_needs_photo (HR6)
  .refine((v) => !v.published || v.photos.length >= 1, {
    message: "Add at least one photo before publishing.",
    path: ["photos"],
  })
  // Alt text is an accessibility requirement, not a nicety (docs/09 § 3).
  .refine((v) => !v.published || v.photos.every((p) => p.alt.trim().length > 0), {
    message: "Every photo needs alt text before this listing can be published.",
    path: ["photos"],
  });

export type ListingInput = z.infer<typeof listingSchema>;

/**
 * The pre-publish checklist rendered on the Publish tab
 * (docs/06-admin-dashboard-spec.md § 4). Each unmet item links to the tab that
 * fixes it, so the Publish button is never disabled without saying why.
 */
export type ChecklistItem = { id: string; label: string; tab: string; ok: boolean };

export function prePublishChecklist(v: Partial<ListingInput>): ChecklistItem[] {
  const photos = v.photos ?? [];
  return [
    {
      id: "photo",
      label: "At least one photo",
      tab: "media",
      ok: photos.length >= 1,
    },
    {
      id: "alt",
      label: "Every photo has alt text",
      tab: "media",
      ok: photos.length > 0 && photos.every((p) => p.alt?.trim()),
    },
    {
      id: "description",
      label: "Description is at least 100 characters",
      tab: "content",
      ok: (v.description?.trim().length ?? 0) >= 100,
    },
    /*
      The "meta description written" item is gone.

      `listingDescription()` has always had a length-gated fallback, so a short
      hand-typed value was silently ignored at render — the gate demanded a
      value the page then threw away. Generation at publish makes that explicit:
      the SEO tab's field is an override, and blank is a valid answer.
    */
    {
      id: "core",
      label: "Price, city and status set",
      tab: "basics",
      ok: v.price != null && v.price > 0 && !!v.cityId && !!v.status,
    },
  ];
}

export const canPublish = (v: Partial<ListingInput>) =>
  prePublishChecklist(v).every((i) => i.ok);
