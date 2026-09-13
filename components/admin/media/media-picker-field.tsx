"use client";

import * as React from "react";
import Image from "next/image";
import { Check, ImageOff, Images, RotateCw, Trash2, Upload } from "lucide-react";

import {
  listHeroImages,
  type HeroImage,
} from "@/app/(admin)/admin/(shell)/pages/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { SITE_ENTITY_ID } from "@/lib/images/site-entity";
import { keyUrl } from "@/lib/storage/url";
import { cn } from "@/lib/utils";

/**
 * A hero photograph, chosen from what is already in the Media library.
 *
 * `ImageField` uploads a new file for one record. A page hero is usually a
 * photograph that is ALREADY uploaded — a city hero, the site hero — and
 * uploading it again would store a second copy against the 1 GB ceiling. So the
 * main action here is choosing, and uploading is the secondary one.
 *
 * Only landscape photographs at least 1400px wide are offered
 * (`getHeroImageCandidates`), so a logo or the 612px listing photo cannot end up
 * stretched across a screen.
 *
 * Choosing changes the section's value; nothing is written until the section's
 * own Save button is pressed, the same as every other field on the form.
 */

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; items: HeroImage[] };

const SOURCE_LABEL: Record<HeroImage["entityType"], string> = {
  city: "City photo",
  community: "Community photo",
  site: "Site image",
  article: "Article image",
  listing: "Listing photo",
  profile: "Profile image",
};

export function MediaPickerField({
  label,
  description,
  imageKey,
  onChange,
}: {
  label: string;
  description?: string;
  imageKey: string | null;
  onChange: (key: string | null) => void;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<LoadState>({ status: "idle" });
  const [choice, setChoice] = React.useState<string | null>(imageKey);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    setState({ status: "loading" });
    const result = await listHeroImages();
    setState(
      result.ok
        ? { status: "ready", items: result.items }
        : { status: "error", error: result.error },
    );
  }, []);

  function openPicker() {
    setChoice(imageKey);
    setOpen(true);
    void load();
  }

  async function upload(file: File) {
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
      // Filed against the site, like the home hero in Settings → Branding.
      body.append("entityType", "site");
      body.append("entityId", SITE_ENTITY_ID);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = (await response.json()) as { key: string } | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      onChange(payload.key);
      setOpen(false);
      toast.success("Uploaded. Save this section to use it.");
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
        <div className="flex flex-col gap-3 admin-card p-3 sm:flex-row sm:items-center">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:w-64">
            <Image
              src={keyUrl(imageKey, 800)}
              alt=""
              fill
              sizes="256px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openPicker}>
              <Images aria-hidden="true" />
              Choose another
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-bg hover:text-danger"
              onClick={() => onChange(null)}
            >
              <Trash2 aria-hidden="true" />
              Use the default
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border-2 border-dashed border-border-strong bg-surface p-5">
          <Images className="size-6 text-accent-quiet" aria-hidden="true" />
          <p className="text-sm text-foreground-muted">
            Showing the default photograph. Choose one from the Media library to
            replace it.
          </p>
          <Button type="button" variant="outline" onClick={openPicker}>
            Choose from Media
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Choose a hero photograph"
          description="Landscape photographs at least 1400px wide, newest first."
          className="max-w-3xl"
        >
          {state.status === "loading" || state.status === "idle" ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="aspect-video animate-pulse rounded-lg bg-surface-sunken"
                />
              ))}
            </ul>
          ) : null}

          {state.status === "error" ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4">
              <p className="text-sm text-foreground">{state.error}</p>
              <Button type="button" variant="outline" onClick={() => void load()}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : null}

          {state.status === "ready" && state.items.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface-sunken p-4">
              <ImageOff className="size-5 text-foreground-subtle" aria-hidden="true" />
              <p className="text-sm text-foreground-muted">
                No photograph in the library is wide enough for a hero yet.
                Upload one below.
              </p>
            </div>
          ) : null}

          {state.status === "ready" && state.items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {state.items.map((item) => {
                const selected = choice === item.key;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setChoice(item.key)}
                      className={cn(
                        "flex w-full flex-col overflow-hidden rounded-lg border-2 bg-surface text-left",
                        "transition-colors duration-(--dur-fast)",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected
                          ? "border-accent"
                          : "border-transparent hover:border-border-strong",
                      )}
                    >
                      <span className="relative block aspect-video w-full bg-surface-sunken">
                        <Image
                          src={keyUrl(item.key, 400)}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 240px, 45vw"
                          className="object-cover"
                          unoptimized
                        />
                        {selected ? (
                          <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg">
                            <Check className="size-4" aria-hidden="true" />
                          </span>
                        ) : null}
                      </span>
                      <span className="px-2 py-1.5 text-xs text-foreground-muted tabular">
                        {SOURCE_LABEL[item.entityType]} · {item.width}×{item.height}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden="true" />
              Upload a new photograph
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="accent"
                disabled={!choice}
                onClick={() => {
                  onChange(choice);
                  setOpen(false);
                }}
              >
                Use this photograph
              </Button>
            </div>
          </DialogFooter>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
