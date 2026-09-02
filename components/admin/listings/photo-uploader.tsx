"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BYTES_PER_PHOTO, formatBytes } from "@/lib/storage/budget";
import { photoUrl } from "@/lib/storage/url";
import { MAX_PHOTOS } from "@/lib/validation/listing";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/domain";

/**
 * The listing photo uploader — docs/06 § 4 Tab 3, docs/07 § 2.
 *
 * Behaviour that is not negotiable:
 *
 *  - photos upload IMMEDIATELY on selection, never on submit. A slow upload
 *    must never block a save (admin-crud skill).
 *  - client-side compression runs first, so a 6 MB phone photo leaves the
 *    browser at roughly 400 kB. The library is imported dynamically: it is only
 *    needed when a file is actually chosen, and it is not small.
 *  - the 15-photo limit is stated at the uploader, in context, and the drop
 *    zone disables itself WITH AN EXPLANATION rather than going silent
 *    (admin UX rule 4).
 *  - per-file progress and per-file retry. One bad photo never blocks the rest.
 *  - reorder is available by BUTTON as well as by drag: drag-and-drop is not
 *    keyboard operable, and this screen has to pass WCAG 2.1 AA like every
 *    other one.
 *
 * Alt text is required before publish. The count of what is missing is shown
 * here rather than only on the Publish tab, because this is where it is fixed.
 */

export type UploaderPhoto = Photo & { uploading?: false };

type PendingUpload = {
  id: string;
  name: string;
  state: "compressing" | "uploading" | "error";
  error?: string;
  file: File;
};

export function PhotoUploader({
  listingId,
  photos,
  onChange,
  onAppend,
  onDeleteKeys,
  disabled,
  disabledReason,
}: {
  listingId: string | null;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  /**
   * Appends ONE photo, reading the current array at call time.
   *
   * Uploads run one after another, and each one used to do
   * `onChange([...photos, next])` against the `photos` captured when the chain
   * started — so fifteen uploads all appended to the same stale array and
   * fourteen of them vanished. The parent reads the live value instead.
   */
  onAppend: (photo: Photo) => void;
  /** Removes the objects from storage as well. No soft delete (docs/07 § 7). */
  onDeleteKeys: (keys: string[]) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<PendingUpload[]>([]);
  const [dragOver, setDragOver] = React.useState(false);

  const remaining = MAX_PHOTOS - photos.length - pending.length;
  const atLimit = remaining <= 0;
  const missingAlt = photos.filter((photo) => !photo.alt?.trim()).length;
  const zoneDisabled = disabled || atLimit;

  const upload = React.useCallback(
    async (entry: PendingUpload) => {
      if (!listingId) return;

      setPending((current) =>
        current.map((p) => (p.id === entry.id ? { ...p, state: "compressing" } : p)),
      );

      try {
        // Dynamic import: only loaded once a file is actually chosen.
        const { default: compress } = await import("browser-image-compression");
        const compressed = await compress(entry.file, {
          maxWidthOrHeight: 2400,
          initialQuality: 0.85,
          fileType: "image/webp",
          useWebWorker: true,
        });

        setPending((current) =>
          current.map((p) => (p.id === entry.id ? { ...p, state: "uploading" } : p)),
        );

        const body = new FormData();
        body.append("file", compressed, entry.name);
        body.append("entityType", "listing");
        body.append("entityId", listingId);

        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = (await response.json()) as
          | { key: string; w: number; h: number; blur: string; bytes: number }
          | { error: string };

        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload ? payload.error : "That photo could not be uploaded.",
          );
        }

        onAppend({
          kind: "stored",
          key: payload.key,
          w: payload.w,
          h: payload.h,
          blur: payload.blur,
          alt: "",
        });
        setPending((current) => current.filter((p) => p.id !== entry.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "That photo could not be uploaded.";
        setPending((current) =>
          current.map((p) =>
            p.id === entry.id ? { ...p, state: "error", error: message } : p,
          ),
        );
      }
    },
    [listingId, onAppend],
  );

  const accept = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!listingId) {
        toast.error("Save this listing once before adding photos.");
        return;
      }

      const room = MAX_PHOTOS - photos.length - pending.length;
      const chosen = Array.from(files);

      if (chosen.length > room) {
        toast.error(
          room <= 0
            ? `This listing already has ${MAX_PHOTOS} photos.`
            : `Only ${room} more ${room === 1 ? "photo fits" : "photos fit"} on this listing. The first ${room} will be added.`,
        );
      }

      const queued: PendingUpload[] = chosen.slice(0, Math.max(0, room)).map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        state: "compressing",
        file,
      }));

      if (queued.length === 0) return;
      setPending((current) => [...current, ...queued]);
      // Sequential, not parallel: three sharp jobs per photo on a small lambda,
      // and a mobile connection is the bottleneck anyway.
      void queued.reduce(
        (chain, entry) => chain.then(() => upload(entry)),
        Promise.resolve(),
      );
    },
    [listingId, photos.length, pending.length, toast, upload],
  );

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.unshift(moved!);
    onChange(next);
  }

  function remove(index: number) {
    const photo = photos[index];
    if (!photo) return;
    onChange(photos.filter((_, i) => i !== index));
    if (photo.kind === "stored") onDeleteKeys([photo.key]);
  }

  function setAlt(index: number, alt: string) {
    onChange(photos.map((photo, i) => (i === index ? { ...photo, alt } : photo)));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Counter + storage estimate ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground tabular">
          {photos.length} / {MAX_PHOTOS} photos
        </p>
        <p className="text-xs text-foreground-subtle">
          About {formatBytes(photos.length * BYTES_PER_PHOTO)} of storage on this
          listing
        </p>
      </div>

      {missingAlt > 0 ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            {missingAlt} {missingAlt === 1 ? "photo is" : "photos are"} missing alt
            text. Publishing is blocked until every photo has it — describe what
            is in the picture, in a few words.
          </span>
        </p>
      ) : null}

      {/* ── Drop zone ──────────────────────────────────────────────────── */}
      <div
        onDragOver={(event) => {
          if (zoneDisabled) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (zoneDisabled) return;
          event.preventDefault();
          setDragOver(false);
          accept(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-(--dur-fast) md:p-8",
          zoneDisabled
            ? "border-border bg-surface-sunken"
            : dragOver
              ? "border-accent bg-accent-wash"
              : "border-border-strong bg-surface",
        )}
      >
        <ImagePlus
          className={cn(
            "size-8",
            zoneDisabled ? "text-foreground-subtle" : "text-accent-quiet",
          )}
          aria-hidden="true"
        />

        {atLimit ? (
          <p className="max-w-[46ch] text-sm text-foreground-muted">
            This listing has all {MAX_PHOTOS} photos. That limit protects the
            storage budget the whole site shares — remove one below to add
            another.
          </p>
        ) : disabled ? (
          <p className="max-w-[46ch] text-sm text-foreground-muted">
            {disabledReason ?? "Photos cannot be added right now."}
          </p>
        ) : (
          <>
            <p className="max-w-[46ch] text-sm text-foreground-muted">
              Drop photos here, or choose them below. They are resized and
              uploaded straight away, so you can keep editing while they finish.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              Choose photos
            </Button>
            <p className="text-xs text-foreground-subtle">
              JPEG, PNG, WebP or AVIF · up to {remaining} more
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {/* ── In-flight files ────────────────────────────────────────────── */}
      {pending.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {pending.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 text-sm",
                entry.state === "error"
                  ? "border-danger/30 bg-danger-bg"
                  : "border-border bg-surface",
              )}
            >
              {entry.state === "error" ? (
                <AlertTriangle className="size-4 shrink-0 text-danger" aria-hidden="true" />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin text-accent-quiet" aria-hidden="true" />
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-foreground">{entry.name}</span>
                <span className="text-xs text-foreground-muted">
                  {entry.state === "compressing"
                    ? "Resizing in your browser…"
                    : entry.state === "uploading"
                      ? "Uploading…"
                      : entry.error}
                </span>
              </div>

              {entry.state === "error" ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void upload(entry)}
                  >
                    <RotateCcw aria-hidden="true" />
                    Retry
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPending((current) => current.filter((p) => p.id !== entry.id))
                    }
                  >
                    Discard
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {/* ── Uploaded photos ────────────────────────────────────────────── */}
      {photos.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.kind === "stored" ? photo.key : photo.url}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-xs"
            >
              <div className="relative aspect-4/3 overflow-hidden rounded-md bg-surface-sunken">
                <Image
                  src={photoUrl(photo, 400)}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 20vw, (min-width: 640px) 40vw, 90vw"
                  className="object-cover"
                  unoptimized
                />
                {index === 0 ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm bg-ink-900 px-2 py-1 text-overline font-semibold tracking-[0.12em] text-gold-400 uppercase">
                    <Star className="size-3" aria-hidden="true" />
                    Cover
                  </span>
                ) : null}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline gap-2 text-xs font-semibold text-foreground">
                  Alt text
                  <span className="font-medium text-foreground-subtle">Required</span>
                </span>
                <input
                  value={photo.alt}
                  onChange={(event) => setAlt(index, event.target.value)}
                  placeholder="Kitchen with quartz island and gas range"
                  aria-invalid={!photo.alt?.trim() || undefined}
                  className={cn(
                    "h-11 w-full rounded-md border bg-surface px-3 text-body text-foreground",
                    "placeholder:text-foreground-subtle",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    photo.alt?.trim() ? "border-border-strong" : "border-danger",
                  )}
                />
              </label>

              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, 1)}
                  disabled={index === photos.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => makeCover(index)}
                  disabled={index === 0}
                >
                  Make cover
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-danger hover:bg-danger-bg hover:text-danger"
                  onClick={() => remove(index)}
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
