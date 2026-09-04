"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { deleteImages } from "@/lib/images/store";
import { recordAudit } from "@/lib/auth/audit";
import { getAdminListingById } from "@/lib/queries/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listingSchema, type ListingInput } from "@/lib/validation/listing";
import { slugify } from "@/lib/utils";

/**
 * Listing mutations.
 *
 * Contract, from the admin-crud skill:
 *   1. requireAdmin() first — RLS is the second layer, not the first
 *   2. re-validate with the SAME zod schema the form used
 *   3. write
 *   4. revalidatePath() every affected public route
 *   5. return { ok, error? } — never throw a Postgres message at the client
 *
 * Writes go through the RLS-respecting server client, so `admin all listings`
 * is enforced by the database on every statement even if step 1 were ever
 * removed by accident.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const AUTH_ERROR = "Your session has expired. Sign in again.";

async function guard(): Promise<string | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return AUTH_ERROR;
  }
}

/**
 * Every public route a listing appears on (admin-crud skill, revalidation
 * table). The city page is included by slug so a listing moving city
 * invalidates both the old and the new one — the caller passes both.
 */
function revalidateListing(slug: string | null, citySlugs: (string | null)[]) {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/sold");
  if (slug) revalidatePath(`/listing/${slug}`);
  for (const city of new Set(citySlugs.filter(Boolean))) {
    revalidatePath(`/${city}`);
    revalidatePath(`/${city}/homes-for-sale`);
  }
  revalidatePath("/admin/listings");
  revalidatePath("/admin");
}

/** Domain input → row. The one place the column mapping is written. */
function toRow(input: ListingInput) {
  return {
    slug: input.slug,
    status: input.status,
    listing_type: input.listingType,
    property_type: input.propertyType,
    price: input.price,
    hoa_fee: input.hoaFee ?? null,
    taxes_annual: input.taxesAnnual ?? null,
    beds: input.beds ?? null,
    baths: input.baths ?? null,
    half_baths: input.halfBaths ?? 0,
    sqft: input.sqft ?? null,
    lot_size: input.lotSize ?? null,
    year_built: input.yearBuilt ?? null,
    garage_spaces: input.garageSpaces ?? 0,
    stories: input.stories ?? null,
    pool: input.pool ?? false,
    waterfront: input.waterfront ?? false,
    features: input.features ?? [],
    address: input.address,
    unit: input.unit ?? null,
    city_id: input.cityId,
    community_id: input.communityId ?? null,
    zip: input.zip ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    headline: input.headline ?? null,
    description: input.description ?? null,
    contractors_take: input.contractorsTake ?? null,
    // Order is normalised on write so the array's index IS the display order
    // and the first entry is always the cover. The UI never has to sort.
    photos: (input.photos ?? []).map((photo, index) => ({ ...photo, order: index })),
    virtual_tour: input.virtualTour ?? null,
    meta_title: input.metaTitle ?? null,
    meta_desc: input.metaDesc ?? null,
    is_featured: input.isFeatured ?? false,
    published: input.published ?? false,
    sold_at: input.soldAt ? new Date(input.soldAt).toISOString() : null,
    sold_price: input.soldPrice ?? null,
    keep_photos: input.keepPhotos ?? false,
  };
}

/**
 * Postgres constraint names, turned into the sentence the client needs.
 * These are the database half of the hard rules; the UI and the API say the
 * same things, and this is the last of the three layers to speak.
 */
function friendlyError(message: string): string {
  if (message.includes("listings_photo_limit")) {
    return "A listing can have at most 15 photos. Remove one before saving.";
  }
  if (message.includes("listings_published_needs_photo")) {
    return "A published listing needs at least one photo.";
  }
  if (message.includes("listings_sold_fields")) {
    return "A sold listing needs both a sold date and a sold price.";
  }
  if (message.includes("listings_slug") || message.includes("duplicate key")) {
    return "That web address is already used by another listing. Change the slug on the SEO tab.";
  }
  console.error(`[listings] ${message}`);
  return "The listing could not be saved. Try again.";
}

/* ── Create ─────────────────────────────────────────────────────────────── */

export async function createListing(
  raw: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("listings")
    .insert(toRow(parsed.data))
    .select("id, slug, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities;
  revalidateListing(data.slug, [city?.slug ?? null]);

  return { ok: true, data: { id: data.id, slug: data.slug } };
}

/* ── Update ─────────────────────────────────────────────────────────────── */

export async function saveListing(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const db = await createSupabaseServerClient();

  // The previous city is needed so a move revalidates the page the listing is
  // LEAVING as well as the one it is joining.
  const { data: before } = await db
    .from("listings")
    .select("slug, cities(slug)")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await db
    .from("listings")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("slug, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  const beforeCity = Array.isArray(before?.cities) ? before.cities[0] : before?.cities;
  const afterCity = Array.isArray(data.cities) ? data.cities[0] : data.cities;

  // HR11: the slug change itself is handled by the log_listing_slug_redirect
  // trigger. The OLD path still needs revalidating so the 301 is served.
  if (before?.slug && before.slug !== data.slug) {
    revalidatePath(`/listing/${before.slug}`);
  }

  revalidateListing(data.slug, [beforeCity?.slug ?? null, afterCity?.slug ?? null]);
  return { ok: true, data: { slug: data.slug } };
}

/* ── Toggles (optimistic in the UI, authoritative here) ─────────────────── */

const toggleSchema = z.object({
  id: z.string().uuid(),
  value: z.boolean(),
});

export async function setListingPublished(raw: unknown): Promise<ActionResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = toggleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That listing could not be found." };

  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("listings")
    .update({ published: parsed.data.value })
    .eq("id", parsed.data.id)
    .select("slug, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities;

  /*
    Audited because publishing is the action with consequences outside this
    dashboard: it puts a URL in front of the public, and HR11 makes that URL
    permanent. "When did this go live, and who did it" is a question that gets
    asked months later.
  */
  await recordAudit({
    action: parsed.data.value ? "property_published" : "property_unpublished",
    entityType: "listing",
    entityId: parsed.data.id,
    metadata: { slug: data.slug },
  });

  revalidateListing(data.slug, [city?.slug ?? null]);
  return { ok: true };
}

export async function setListingFeatured(raw: unknown): Promise<ActionResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = toggleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That listing could not be found." };

  const db = await createSupabaseServerClient();
  const { error } = await db
    .from("listings")
    .update({ is_featured: parsed.data.value })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/");
  revalidatePath("/admin/listings");
  return { ok: true };
}

/* ── Duplicate ──────────────────────────────────────────────────────────── */

/**
 * High-value for this client: most of her listings share a city, a feature set
 * and a description structure (docs/06 § 4).
 *
 * Cleared: address, unit, slug, price, photos, sold fields, published, MLS
 * fields. Kept: everything that describes how she works.
 */
export async function duplicateListing(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const source = await getAdminListingById(id);
  if (!source) return { ok: false, error: "That listing could not be found." };

  const db = await createSupabaseServerClient();
  const suffix = Math.random().toString(36).slice(2, 7);

  const { data, error } = await db
    .from("listings")
    .insert({
      slug: `copy-of-${source.slug}-${suffix}`.slice(0, 120),
      status: "coming_soon",
      listing_type: source.listingType,
      property_type: source.propertyType,
      price: source.price,
      hoa_fee: source.hoaFee,
      taxes_annual: source.taxesAnnual,
      beds: source.beds,
      baths: source.baths,
      half_baths: source.halfBaths,
      sqft: source.sqft,
      lot_size: source.lotSize,
      year_built: source.yearBuilt,
      garage_spaces: source.garageSpaces,
      stories: source.stories,
      pool: source.pool,
      waterfront: source.waterfront,
      features: source.features,
      address: `Copy of ${source.address}`.slice(0, 200),
      city_id: source.city.id,
      community_id: source.community?.id ?? null,
      zip: source.zip,
      headline: source.headline,
      description: source.description,
      contractors_take: source.contractorsTake,
      // Photos are NOT copied. Two listings sharing a photo key would mean
      // deleting one breaks the other, and the storage budget cannot afford a
      // second copy of the objects either.
      photos: [],
      meta_title: null,
      meta_desc: source.metaDesc,
      is_featured: false,
      published: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/admin/listings");
  return { ok: true, data: { id: data.id } };
}

/* ── Delete ─────────────────────────────────────────────────────────────── */

/**
 * Destructive actions need friction (admin UX rule 3): the caller must send
 * back the listing's exact address. A plain "are you sure" is not enough for
 * an action that also frees storage objects.
 */
export async function deleteListing(
  id: string,
  confirmation: string,
): Promise<ActionResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const listing = await getAdminListingById(id);
  if (!listing) return { ok: false, error: "That listing could not be found." };

  if (confirmation.trim().toLowerCase() !== listing.address.trim().toLowerCase()) {
    return { ok: false, error: "The address you typed does not match." };
  }

  // Storage first: docs/07 § 7. If it fails we still delete the row and let the
  // orphan cron reclaim the bytes — never leave a row pointing at nothing.
  const keys = listing.photos
    .filter((photo) => photo.kind === "stored")
    .map((photo) => photo.key);
  await deleteImages(keys);

  const db = await createSupabaseServerClient();
  const { error } = await db.from("listings").delete().eq("id", id);

  if (error) return { ok: false, error: friendlyError(error.message) };

  /*
    The address and slug are recorded, not just the id.

    The row is gone by the time anyone reads this log, so an id alone would be
    unresolvable — the audit entry has to carry enough to identify what was
    deleted on its own.
  */
  await recordAudit({
    action: "property_deleted",
    entityType: "listing",
    entityId: id,
    metadata: { slug: listing.slug, address: listing.address, photos: keys.length },
  });

  revalidateListing(listing.slug, [listing.city.slug]);
  return { ok: true };
}

/* ── Bulk ───────────────────────────────────────────────────────────────── */

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["publish", "unpublish", "feature", "unfeature", "delete"]),
  /** Required for delete: the exact number of listings, typed by the user. */
  confirmation: z.string().optional(),
});

export async function bulkListingAction(
  raw: unknown,
): Promise<ActionResult<{ affected: number }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That bulk action is not valid." };

  const { ids, action, confirmation } = parsed.data;
  const db = await createSupabaseServerClient();

  if (action === "delete") {
    if (confirmation?.trim() !== String(ids.length)) {
      return {
        ok: false,
        error: `Type ${ids.length} to confirm deleting ${ids.length} listings.`,
      };
    }

    const { data: rows } = await db
      .from("listings")
      .select("id, slug, photos, cities(slug)")
      .in("id", ids);

    const keys: string[] = [];
    for (const row of rows ?? []) {
      for (const photo of (row.photos ?? []) as { kind?: string; key?: string }[]) {
        if (photo?.kind === "stored" && photo.key) keys.push(photo.key);
      }
    }
    await deleteImages(keys);

    const { error } = await db.from("listings").delete().in("id", ids);
    if (error) return { ok: false, error: friendlyError(error.message) };

    for (const row of rows ?? []) {
      const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
      revalidateListing(row.slug as string, [city?.slug ?? null]);
    }
    return { ok: true, data: { affected: ids.length } };
  }

  const patch =
    action === "publish"
      ? { published: true }
      : action === "unpublish"
        ? { published: false }
        : action === "feature"
          ? { is_featured: true }
          : { is_featured: false };

  const { error } = await db.from("listings").update(patch).in("id", ids);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin/listings");
  revalidatePath("/admin");
  return { ok: true, data: { affected: ids.length } };
}

/* ── Helpers used by the editor ─────────────────────────────────────────── */

/** Slug from address + city, per docs/06 § 4, Tab 5. */
export async function suggestSlug(
  address: string,
  cityName: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(`${address} ${cityName}`) || "listing";
  const db = await createSupabaseServerClient();

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let q = db.from("listings").select("id").eq("slug", candidate).limit(1);
    if (exceptId) q = q.neq("id", exceptId);

    const { data } = await q;
    if ((data ?? []).length === 0) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Removes photos from a listing AND from storage, in one action.
 *
 * No soft delete: the storage budget cannot afford a recycle bin
 * (docs/07 § 7). Called by the uploader when a photo is removed, so the bytes
 * go back immediately rather than at the next orphan sweep.
 */
export async function deleteListingPhotos(
  listingId: string,
  keys: string[],
): Promise<ActionResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  if (keys.length === 0) return { ok: true };

  const db = await createSupabaseServerClient();
  const { data: listing } = await db
    .from("listings")
    .select("photos")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { ok: false, error: "That listing could not be found." };

  const remaining = ((listing.photos ?? []) as { key?: string }[]).filter(
    (photo) => !photo.key || !keys.includes(photo.key),
  );

  const { error } = await db
    .from("listings")
    .update({ photos: remaining.map((photo, index) => ({ ...photo, order: index })) })
    .eq("id", listingId);

  if (error) return { ok: false, error: friendlyError(error.message) };

  await deleteImages(keys);
  revalidatePath("/admin/media");
  return { ok: true };
}
