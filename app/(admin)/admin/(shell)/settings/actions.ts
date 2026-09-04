"use server";

import { revalidatePath } from "next/cache";

import { purgeSoldPhotos } from "@/lib/images/purge";
import { markMaintenanceRun } from "@/lib/queries/settings";
import { recordAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { settingsSchema } from "@/lib/validation/settings";

/**
 * Settings mutations.
 *
 * Settings feed the footer, the contact block and the JSON-LD on every public
 * page, so a save revalidates the whole site rather than one route. That is the
 * one place in this codebase where `revalidatePath("/", "layout")` is correct.
 */

export type SettingsResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function saveSettings(raw: unknown): Promise<SettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [
          key,
          value ?? [],
        ]),
      ),
    };
  }

  const v = parsed.data;

  // Empty profile values are dropped rather than stored as null: `sameAs` is
  // built from this object, and a JSON-LD array full of blanks is worse than a
  // short one (lib/seo/jsonld.ts).
  const profiles = Object.fromEntries(
    Object.entries(v.profiles ?? {}).filter(([, url]) => Boolean(url)),
  );

  const db = createServiceClient();
  const { error } = await db
    .from("site_settings")
    .update({
      phone: v.phone ?? null,
      email: v.email ?? null,
      address_street: v.addressStreet ?? null,
      address_locality: v.addressLocality ?? null,
      address_region: v.addressRegion ?? null,
      address_postal: v.addressPostal ?? null,
      office_hours: v.officeHours ?? null,
      profiles_json: profiles,
      positioning: v.positioning ?? null,
      announcement: v.announcement ?? null,
      announcement_href: v.announcementHref ?? null,
      brokerage_name: v.brokerageName ?? null,
      license_re: v.licenseRe ?? null,
      license_contractor: v.licenseContractor ?? null,
      disclosure_text: v.disclosureText ?? null,

      // Branding, migration 015.
      brand_name: v.brandName ?? null,
      legal_name: v.legalName ?? null,
      logo_key: v.logoKey ?? null,
      logo_invert_key: v.logoInvertKey ?? null,
      license_re_label: v.licenseReLabel ?? null,
      license_re_authority: v.licenseReAuthority ?? null,
      license_contractor_label: v.licenseContractorLabel ?? null,
      license_contractor_authority: v.licenseContractorAuthority ?? null,
      years_experience: v.yearsExperience ?? null,
      lead_notify_email: v.leadNotifyEmail ?? null,
      autoresponder_subject: v.autoresponderSubject ?? null,
      autoresponder_body: v.autoresponderBody ?? null,
    })
    .eq("id", 1);

  if (error) {
    console.error(`[saveSettings] ${error.message}`);
    return { ok: false, error: "Settings could not be saved. Try again." };
  }

  // Settings appear in the layout, so every page is affected.
  /*
    Audited: these fields include the brokerage name and both licence numbers,
    which are the legal disclosure on every public page. "Who changed the
    brokerage name, and when" is a question that gets asked after a complaint,
    not before.
  */
  await recordAudit({
    action: "settings_updated",
    entityType: "site_settings",
    entityId: "1",
    metadata: { fields: Object.keys(parsed.data).length },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Manual trigger for the sold-photo purge (docs/06 § 10, Maintenance).
 *
 * Runs exactly the same function the nightly cron does. A maintenance button
 * that runs different code from the scheduled job is a button that has never
 * really been tested.
 */
export async function runPurgeNow(): Promise<SettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  try {
    const result = await purgeSoldPhotos();
    await markMaintenanceRun("last_purge_run");

    for (const slug of result.purgedSlugs) revalidatePath(`/listing/${slug}`);
    if (result.listings > 0) {
      revalidatePath("/sold");
      revalidatePath("/admin/media");
    }
    revalidatePath("/admin");
    revalidatePath("/admin/settings");

    return {
      ok: true,
      message:
        result.listings === 0
          ? "Nothing was due. Large photos are removed 7 days after a sale."
          : `Purged ${result.listings} ${result.listings === 1 ? "listing" : "listings"}, freeing about ${Math.round(result.bytesFreed / 1024)} kB. Every page is still live.`,
    };
  } catch (error) {
    console.error("[runPurgeNow]", error);
    return { ok: false, error: "The purge could not finish. Try again." };
  }
}
