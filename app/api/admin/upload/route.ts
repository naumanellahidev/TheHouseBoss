import { NextResponse, type NextRequest } from "next/server";

import {
  ACCEPTED_MIME,
  ImageProcessingError,
  MAX_UPLOAD_BYTES,
} from "@/lib/images/process";
import { storeImage, type EntityType } from "@/lib/images/store";
import { UPLOAD_LIMIT, rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAX_PHOTOS } from "@/lib/validation/listing";

/**
 * The image-upload endpoint — docs/07-image-pipeline.md § 2.
 *
 * `sharp` is a native module, so this route MUST run on Node. Edge cannot run
 * it; do not "optimise" the runtime.
 *
 * One file per request. That is deliberate: per-file progress and per-file
 * retry (docs/06 § 4, Tab 3) are only possible if a slow or corrupt photo
 * cannot take the other fourteen down with it.
 *
 * The 15-photo limit is checked here as well as in the uploader UI and as a
 * Postgres CHECK constraint (HR3). All three layers agree; this is the one an
 * automated client cannot skip.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const ENTITY_TYPES: EntityType[] = [
  "listing",
  "article",
  "city",
  "community",
  "profile",
  "site",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // ── 1. auth ────────────────────────────────────────────────────────────
  let userId: string;
  try {
    const { user } = await requireAdmin();
    userId = user.id;
  } catch {
    return NextResponse.json(
      { error: "Sign in again to upload photos." },
      { status: 401 },
    );
  }

  // ── 2. rate limit ──────────────────────────────────────────────────────
  const limit = rateLimit(`upload:${userId}`, UPLOAD_LIMIT.limit, UPLOAD_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `That is a lot of uploads at once. Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  // ── 3. parse ───────────────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That upload was malformed." }, { status: 400 });
  }

  const file = form.get("file");
  const entityType = String(form.get("entityType") ?? "listing") as EntityType;
  const entityId = String(form.get("entityId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was received." }, { status: 400 });
  }
  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Unknown upload target." }, { status: 400 });
  }
  if (!UUID.test(entityId)) {
    return NextResponse.json(
      { error: "Save this record once before adding photos — they are filed under it." },
      { status: 400 },
    );
  }

  // ── 4. mime allowlist and size cap ─────────────────────────────────────
  // The declared type is a hint only; sharp re-checks by decoding the bytes.
  if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
    return NextResponse.json(
      { error: `${file.type || "That file type"} is not an image we accept. Use JPEG, PNG, WebP or AVIF.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1_048_576).toFixed(1)} MB. The limit is 10 MB.` },
      { status: 413 },
    );
  }

  // ── 5. per-listing photo count (HR3, layer 2 of 3) ─────────────────────
  if (entityType === "listing") {
    const db = await createSupabaseServerClient();
    const { data } = await db
      .from("listings")
      .select("photos")
      .eq("id", entityId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "That listing no longer exists." }, { status: 404 });
    }

    const count = Array.isArray(data.photos) ? data.photos.length : 0;
    if (count >= MAX_PHOTOS) {
      return NextResponse.json(
        { error: `This listing already has ${MAX_PHOTOS} photos, which is the maximum. Remove one first.` },
        { status: 409 },
      );
    }
  }

  // ── 6. process, upload, account ────────────────────────────────────────
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeImage({ buffer, entityType, entityId });

    return NextResponse.json({
      key: stored.key,
      w: stored.width,
      h: stored.height,
      blur: stored.blur,
      bytes: stored.bytes,
    });
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Never leak a storage or Postgres message to the browser.
    console.error("[upload] failed:", error);
    return NextResponse.json(
      { error: "That photo could not be processed. Try again, or try a different file." },
      { status: 500 },
    );
  }
}
