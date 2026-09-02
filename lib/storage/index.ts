import { supabaseProvider } from "@/lib/storage/providers/supabase";
import type { StorageProvider } from "@/lib/storage/types";

/**
 * Provider selection. Everything downstream imports `storage` and never a
 * concrete provider.
 *
 * Today only `supabase` is implemented. `r2` and `local` are deliberate,
 * documented stubs rather than absent code — the escalation path in
 * docs/07-image-pipeline.md § 10 is:
 *
 *   1. write providers/r2.ts (do this at ~600 MB used, not at 950 MB)
 *   2. copy objects across, keeping every key byte-identical
 *   3. change STORAGE_DRIVER and NEXT_PUBLIC_MEDIA_URL
 *
 * No database migration is needed, because the DB stores keys and not URLs
 * (hard rule 1). That is the entire return on this indirection.
 */

const driver = process.env.STORAGE_DRIVER ?? "supabase";

function unimplemented(name: "r2" | "local"): never {
  throw new Error(
    `STORAGE_DRIVER=${name} is not implemented yet. See ` +
      `docs/07-image-pipeline.md § 10 for the migration steps. ` +
      `Keys are portable, so no schema change is required.`,
  );
}

export const storage: StorageProvider = (() => {
  switch (driver) {
    case "supabase":
      return supabaseProvider;
    case "r2":
      return unimplemented("r2");
    case "local":
      return unimplemented("local");
    default:
      throw new Error(
        `Unknown STORAGE_DRIVER "${driver}". Expected supabase | r2 | local.`,
      );
  }
})();

export * from "@/lib/storage/types";
export { photoUrl, keyUrl, allVariantPaths, purgeablePaths } from "@/lib/storage/url";
