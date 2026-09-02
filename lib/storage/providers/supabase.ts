import { createServiceClient } from "@/lib/supabase/service";
import {
  IMMUTABLE_CACHE,
  type StorageProvider,
  type UploadInput,
} from "@/lib/storage/types";

const BUCKET = "media";

/**
 * Supabase Storage — the active provider.
 *
 * This is the ONLY module in the codebase allowed to touch
 * `supabase.storage` (CLAUDE.md hard rule 8).
 *
 * Budget: 1 GB. Every write here consumes it, which is why the upload route
 * never persists an original and why the sold-photo purge exists at all. See
 * docs/07-image-pipeline.md.
 */
export const supabaseProvider: StorageProvider = {
  name: "supabase",

  async upload({ buffer, path, contentType, cacheControl }: UploadInput) {
    const db = createServiceClient();
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      cacheControl: cacheControl ?? IMMUTABLE_CACHE,
      upsert: true,
    });
    if (error) {
      throw new Error(`storage upload failed for ${path}: ${error.message}`);
    }
  },

  async deleteMany(paths: string[]) {
    if (paths.length === 0) return { deleted: 0, failed: [] };

    const db = createServiceClient();
    const failed: string[] = [];
    let deleted = 0;

    // The remove() API caps at 1000 paths per call.
    for (let i = 0; i < paths.length; i += 500) {
      const batch = paths.slice(i, i + 500);
      const { data, error } = await db.storage.from(BUCKET).remove(batch);
      if (error) failed.push(...batch);
      else deleted += data?.length ?? 0;
    }

    return { deleted, failed };
  },

  publicUrl(path: string) {
    const base = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "") ?? "";
    return `${base}/${path}`;
  },

  async list(prefix: string) {
    const db = createServiceClient();
    const out: string[] = [];
    const limit = 1000;
    let offset = 0;

    for (;;) {
      const { data, error } = await db.storage
        .from(BUCKET)
        .list(prefix, { limit, offset });
      if (error) {
        throw new Error(`storage list failed for ${prefix}: ${error.message}`);
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        // A folder entry has no id; recurse into it.
        if (item.id === null) {
          out.push(...(await supabaseProvider.list(`${prefix}/${item.name}`)));
        } else {
          out.push(prefix ? `${prefix}/${item.name}` : item.name);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }

    return out;
  },

  async exists(path: string) {
    const db = createServiceClient();
    const slash = path.lastIndexOf("/");
    const dir = slash === -1 ? "" : path.slice(0, slash);
    const file = slash === -1 ? path : path.slice(slash + 1);

    const { data } = await db.storage
      .from(BUCKET)
      .list(dir, { limit: 1, search: file });

    return (data ?? []).some((i) => i.name === file);
  },
};
