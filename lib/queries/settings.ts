import { createServiceClient } from "@/lib/supabase/service";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { AdminSettings, SiteSettings } from "@/types/domain";

/**
 * The single settings row (`site_settings.id = 1`).
 *
 * Two entry points on purpose:
 *
 *   getSiteSettings()  — reads `site_settings_public`, the reviewed subset of
 *                        columns, through the COOKIE-FREE anon client. It is
 *                        called from the marketing layout, so using the session
 *                        client here would opt every public page out of static
 *                        rendering — the same trap the listing queries hit in
 *                        Phase 3 (lib/supabase/public.ts).
 *   getAdminSettings() — reads the whole row with the service client. Callers
 *                        must have passed requireAdmin() first.
 *
 * NULL is meaningful: it means the client has not supplied the value yet, and
 * the caller falls back to the PENDING sentinel in lib/site-config.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

/** PostgREST returns numerics as strings often enough to be worth normalising. */
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Drops empty values so a `sameAs` array of blanks can never be emitted. */
function toProfiles(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, value] of Object.entries(v as Record<string, unknown>)) {
    const url = str(value);
    if (url) out[k] = url;
  }
  return out;
}

function toSiteSettings(row: Row | null): SiteSettings {
  return {
    phone: str(row?.phone),
    email: str(row?.email),
    address: {
      street: str(row?.address_street),
      locality: str(row?.address_locality),
      region: str(row?.address_region),
      postalCode: str(row?.address_postal),
    },
    officeHours: str(row?.office_hours),
    profiles: toProfiles(row?.profiles_json),
    positioning: str(row?.positioning),
    announcement: str(row?.announcement),
    announcementHref: str(row?.announcement_href),
    ogKey: str(row?.og_key),
    heroKey: str(row?.hero_key),
    brokerageName: str(row?.brokerage_name),
    licenseRe: str(row?.license_re),
    licenseContractor: str(row?.license_contractor),
    disclosureText: str(row?.disclosure_text),

    // Branding overrides, migration 015. NULL means "use lib/site-config.ts".
    brandName: str(row?.brand_name),
    legalName: str(row?.legal_name),
    logoKey: str(row?.logo_key),
    logoInvertKey: str(row?.logo_invert_key),
    logoW: num(row?.logo_w),
    logoH: num(row?.logo_h),
    logoInvertW: num(row?.logo_invert_w),
    logoInvertH: num(row?.logo_invert_h),
    licenseReLabel: str(row?.license_re_label),
    licenseReAuthority: str(row?.license_re_authority),
    licenseContractorLabel: str(row?.license_contractor_label),
    licenseContractorAuthority: str(row?.license_contractor_authority),
    yearsExperience:
      typeof row?.years_experience === "number" ? row.years_experience : null,

    updatedAt: str(row?.updated_at),
  };
}

/** Empty settings — every field NULL, so every fallback applies. */
export const EMPTY_SETTINGS: SiteSettings = toSiteSettings(null);

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("site_settings_public")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`getSiteSettings: ${error.message}`);
  return toSiteSettings(data);
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`getAdminSettings: ${error.message}`);

  return {
    ...toSiteSettings(data),
    leadNotifyEmail: str(data?.lead_notify_email),
    autoresponderSubject: str(data?.autoresponder_subject),
    autoresponderBody: str(data?.autoresponder_body),
    lastOrphanSweep: str(data?.last_orphan_sweep),
    lastPurgeRun: str(data?.last_purge_run),
    lastSitemapPing: str(data?.last_sitemap_ping),
  };
}

/** Stamps one of the `last_*` maintenance timestamps. Cron and admin only. */
export async function markMaintenanceRun(
  column: "last_orphan_sweep" | "last_purge_run" | "last_sitemap_ping",
): Promise<void> {
  const db = createServiceClient();
  const now = new Date().toISOString();

  // Written out rather than built from a computed key: a computed key widens to
  // `string` and the generated Update type rejects it, and a cast here would
  // throw away the only check that the column name is real.
  const patch =
    column === "last_orphan_sweep"
      ? { last_orphan_sweep: now }
      : column === "last_purge_run"
        ? { last_purge_run: now }
        : { last_sitemap_ping: now };

  const { error } = await db.from("site_settings").update(patch).eq("id", 1);

  if (error) console.error(`markMaintenanceRun(${column}): ${error.message}`);
}
