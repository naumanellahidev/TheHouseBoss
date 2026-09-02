"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { keyUrl } from "@/lib/storage/url";
import { cn } from "@/lib/utils";
import type { EntityType } from "@/lib/images/store";

/**
 * A single image with its alt text — a city or community hero, an article
 * cover.
 *
 * The listing uploader handles a gallery of fifteen; this handles exactly one,
 * and the difference is enough that sharing an implementation would mean a
 * component with two modes and twice the states. What they DO share is the
 * pipeline: the same `/api/admin/upload` route, so every stored object still
 * gets a `media` row and counts against the budget (HR9).
 *
 * Alt text sits with the image rather than in a separate field elsewhere on the
 * form, because a picture and its description are one decision.
 */
export function ImageField({
  label,
  description,
  entityType,
  entityId,
  imageKey,
  alt,
  onChange,
  disabledReason,
}: {
  label: string;
  description?: string;
  entityType: EntityType;
  /** Null until the record has been saved once; uploads need somewhere to file. */
  entityId: string | null;
  imageKey: string | null;
  alt: string | null;
  onChange: (next: { key: string | null; alt: string | null }) => void;
  disabledReason?: string;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function upload(file: File) {
    if (!entityId) {
      toast.error(disabledReason ?? "Save this once before adding an image.");
      return;
    }

    setUploading(true);
    try {
      const { default: compress } = await import("browser-image-compression");
      const compressed = await compress(file, {
        maxWidthOrHeight: 2400,
        initialQuality: 0.85,
        fileType: "image/webp",
        useWebWorker: true,
      });

      const body = new FormData();
      body.append("file", compressed, file.name);
      body.append("entityType", entityType);
      body.append("entityId", entityId);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = (await response.json()) as
        | { key: string }
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      onChange({ key: payload.key, alt: alt ?? "" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That image could not be added.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </Field>

      {imageKey ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:w-56">
            <Image
              src={keyUrl(imageKey, 800)}
              alt=""
              fill
              sizes="224px"
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="flex items-baseline gap-2 text-xs font-semibold text-foreground">
                Alt text
                <span className="font-medium text-foreground-subtle">Required</span>
              </span>
              <input
                value={alt ?? ""}
                onChange={(event) => onChange({ key: imageKey, alt: event.target.value })}
                placeholder="Downtown Lake Mary on a clear afternoon"
                aria-invalid={!alt?.trim() || undefined}
                className={cn(
                  "h-11 w-full rounded-md border bg-surface px-3 text-body text-foreground",
                  "placeholder:text-foreground-subtle",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  alt?.trim() ? "border-border-strong" : "border-danger",
                )}
              />
            </label>

            <div className="mt-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={uploading}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-bg hover:text-danger"
                onClick={() => onChange({ key: null, alt: null })}
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border-2 border-dashed border-border-strong bg-surface p-5">
          <ImagePlus className="size-6 text-accent-quiet" aria-hidden="true" />
          <p className="text-sm text-foreground-muted">
            {entityId
              ? "No image yet. It is resized and uploaded straight away."
              : (disabledReason ?? "Save this once before adding an image.")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            disabled={!entityId}
            onClick={() => inputRef.current?.click()}
          >
            Choose an image
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
