/**
 * The `entity_id` every site-wide image is filed under.
 *
 * `site_settings` is a single row keyed `id = 1`, but `media.entity_id` is a
 * uuid — so site-wide artwork (the OG card, the hero, the logo) needs a stable
 * uuid that is obviously not a real record. This sentinel is that.
 *
 * ── Why it is its own file ────────────────────────────────────────────────
 *
 * It belongs next to `storeImage` conceptually and was put there first. But
 * `lib/images/store.ts` imports sharp and the storage adapter, and the Branding
 * tab is a client component — importing the constant from there dragged the
 * whole server pipeline into the client bundle and the build failed on
 * `child_process`. A constant with no imports of its own cannot do that.
 */
export const SITE_ENTITY_ID = "00000000-0000-4000-8000-000000000001";
