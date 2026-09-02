"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { IMAGE_SIZES, PropertyImage } from "@/components/site/property-image";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/domain";

/**
 * Listing gallery — docs/04 § 5 (Listing detail).
 *
 *   mobile   swipe carousel, 4:3, dots + "3 / 12", tap opens the lightbox
 *   ≥1024px  hero 8/12 left, 2x2 thumbnail grid 4/12 right, "View all N photos"
 *
 * Accessibility is the hard part and it is not optional here (docs/09 § 3):
 *
 *  - the carousel is a scroll container, so swipe and keyboard scrolling work
 *    natively; the arrows drive `scrollTo` rather than a bespoke transform
 *  - every thumbnail is a real button with an accessible name
 *  - the lightbox is a Radix Dialog: focus is trapped, Escape closes it, body
 *    scroll is locked, and focus RETURNS to the trigger on close — that last
 *    one is the Definition-of-Done item people usually miss
 *  - Left/Right arrows move between photos while the lightbox is open
 *
 * A purged sold listing (HR10) never reaches this component: the page renders
 * <ArchivedPhotos /> instead.
 */
export function Gallery({
  photos,
  address,
}: {
  photos: Photo[];
  address: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const scrollerRef = React.useRef<HTMLUListElement>(null);

  /**
   * The element that opened the lightbox, so focus can go back to it.
   *
   * Radix restores focus to its own <Dialog.Trigger>, but this dialog is opened
   * from whichever thumbnail was activated — there is no single trigger for it
   * to restore to. Without this, closing the lightbox drops focus onto <body>
   * and a keyboard user is thrown back to the top of the document.
   */
  const openedBy = React.useRef<HTMLElement | null>(null);

  if (photos.length === 0) return null;

  const count = photos.length;
  const clamp = (next: number) => (next + count) % count;

  function openAt(next: number, event: React.MouseEvent<HTMLButtonElement>) {
    openedBy.current = event.currentTarget;
    setIndex(next);
    setOpen(true);
  }

  function scrollTo(next: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[next] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <>
      {/* ── Mobile: swipe carousel ───────────────────────────────────── */}
      <div className="relative lg:hidden">
        <ul
          ref={scrollerRef}
          // A native scroll-snap container: swipe, trackpad and keyboard
          // scrolling all work without a carousel library.
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto"
          onScroll={(event) => {
            const el = event.currentTarget;
            const width = el.clientWidth || 1;
            setIndex(Math.round(el.scrollLeft / width));
          }}
        >
          {photos.map((photo, i) => (
            <li key={keyOf(photo, i)} className="w-full shrink-0 snap-start">
              <button
                type="button"
                onClick={(event) => openAt(i, event)}
                className="block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <PropertyImage
                  photo={photo}
                  size={800}
                  sizes="100vw"
                  priority={i === 0}
                  aspect="4/3"
                />
                <span className="sr-only">
                  Open photo {i + 1} of {count} full size
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="pointer-events-none absolute right-3 bottom-3 rounded-sm bg-ink-950/80 px-2 py-1 text-xs font-medium text-bone-50 tabular">
          {index + 1} / {count}
        </p>

        {count > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={`dot-${keyOf(photo, i)}`}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                // 44px tap target around a 8px dot.
                className="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block size-2 rounded-full transition-colors duration-(--dur-fast)",
                    i === index ? "bg-accent" : "bg-border-strong",
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Desktop: hero + thumbnail grid ───────────────────────────── */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-12">
        <div className="col-span-8">
          <button
            type="button"
            onClick={(event) => openAt(0, event)}
            className="group relative block w-full overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PropertyImage
              photo={photos[0]!}
              size={1600}
              sizes={IMAGE_SIZES.listingHero}
              priority
              aspect="4/3"
              className="transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.01]"
            />
            <span className="sr-only">Open the gallery, {count} photos</span>
          </button>
        </div>

        <div className="col-span-4 grid grid-cols-2 grid-rows-2 gap-3">
          {photos.slice(1, 5).map((photo, i) => (
            <button
              key={keyOf(photo, i + 1)}
              type="button"
              onClick={(event) => openAt(i + 1, event)}
              className="group relative overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PropertyImage
                photo={photo}
                size={400}
                sizes="17vw"
                aspect="4/3"
                className="transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.03]"
              />
              <span className="sr-only">
                Open photo {i + 2} of {count} full size
              </span>
            </button>
          ))}

          {/* Fill the 2x2 grid when there are fewer than five photos, so the
              hero never sits next to a ragged hole. */}
          {Array.from({ length: Math.max(0, 4 - (count - 1)) }).map((_, i) => (
            <div
              key={`filler-${i}`}
              aria-hidden="true"
              className="rounded-lg border border-dashed border-border bg-surface-sunken"
            />
          ))}
        </div>

        {count > 5 ? (
          <div className="col-span-12">
            <button
              type="button"
              onClick={(event) => openAt(0, event)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium",
                "text-foreground transition-colors duration-(--dur-fast) hover:bg-surface-sunken",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <Expand className="size-4" aria-hidden="true" />
              View all {count} photos
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/95" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col focus:outline-none"
            onCloseAutoFocus={(event) => {
              // Take over from Radix and return focus to the thumbnail that
              // opened this, whichever one it was.
              event.preventDefault();
              openedBy.current?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                setIndex((i) => clamp(i + 1));
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setIndex((i) => clamp(i - 1));
              }
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              Photos of {address}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Use the left and right arrow keys to move between photos, and
              Escape to close.
            </DialogPrimitive.Description>

            <div className="flex items-center justify-between gap-4 px-4 py-3 text-foreground-invert">
              <p className="text-sm tabular" aria-live="polite">
                {index + 1} / {count}
              </p>
              <DialogPrimitive.Close
                aria-label="Close the gallery"
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-md text-foreground-invert-muted",
                  "hover:bg-ink-800 hover:text-foreground-invert",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
                )}
              >
                <X className="size-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
              <div className="max-h-full w-full max-w-5xl">
                <PropertyImage
                  photo={photos[index]!}
                  size={1600}
                  sizes="(max-width: 1023px) 100vw, 1024px"
                  aspect="4/3"
                  wrapperClassName="rounded-lg bg-ink-900"
                  className="object-contain"
                />
              </div>

              {count > 1 ? (
                <>
                  <LightboxArrow
                    side="left"
                    onClick={() => setIndex((i) => clamp(i - 1))}
                  />
                  <LightboxArrow
                    side="right"
                    onClick={() => setIndex((i) => clamp(i + 1))}
                  />
                </>
              ) : null}
            </div>

            {photos[index]?.alt ? (
              <p className="px-4 pb-4 text-center text-sm text-foreground-invert-muted">
                {photos[index]!.alt}
              </p>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function LightboxArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full",
        "bg-ink-900/80 text-foreground-invert",
        "transition-colors duration-(--dur-fast) hover:bg-ink-800",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}

const keyOf = (photo: Photo, i: number) =>
  photo.kind === "stored" ? photo.key : `${photo.url}-${i}`;

/**
 * What a sold listing shows once its large derivatives have been purged
 * (HR10). The page, the URL and the ranking all survive; only the big files
 * are gone, so the single surviving 400w cover is shown with an explanation
 * rather than a broken gallery.
 */
export function ArchivedPhotos({
  cover,
  address,
}: {
  cover: Photo | null;
  address: string;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <PropertyImage
        photo={cover}
        size={400}
        sizes={IMAGE_SIZES.listingHero}
        priority
        aspect="4/3"
        wrapperClassName="rounded-lg"
      />
      <figcaption className="text-sm text-foreground-muted">
        Photos archived — this property has sold. {address} is kept here as part
        of the sold record; the full-size photos were removed to save storage.
      </figcaption>
    </figure>
  );
}
