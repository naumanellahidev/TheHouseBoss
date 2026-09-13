import * as React from "react";

import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { Container } from "@/components/site/container";
import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/domain";

/**
 * Standard hero for content pages.
 *
 * Two grounds:
 *
 *   - `photo` given: the photograph edge to edge behind the copy, the way the
 *     home and city heroes are built. It is decorative here — the heading says
 *     what the page is — so it renders `aria-hidden` with empty alt, like the
 *     home hero.
 *   - no photo: the navy ground with a faint architectural grid, which is a
 *     finished design rather than a grey box waiting for an image.
 *
 * Over a photograph the copy is carried by `photo-scrim-hero` (measured on the
 * city hubs) plus a left-weighted wash from 1024px, where the copy sits in the
 * left columns and the right of the picture is left clearer. Every element of
 * text is marked `data-hero-text` so `tests/hero-contrast.spec.ts` can measure
 * it against the real pixels behind it, whatever photograph is chosen later.
 *
 * `aside` fills a right-hand column from 1024px (a glass card of actions, say)
 * and stacks under the copy below that.
 */
export function PageHero({
  overline,
  title,
  lead,
  crumbs,
  children,
  aside,
  photo,
  size = "md",
}: {
  overline?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  crumbs?: Crumb[];
  children?: React.ReactNode;
  aside?: React.ReactNode;
  photo?: Photo | null;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <section
      /*
        Runs up behind the transparent header. The rule and the reasoning are
        in app/globals.css under HEADER OVERLAY AND TONE; without this marker
        the page is treated as light and the header keeps its own space.
      */
      data-hero-bleed=""
      className={cn(
        "relative isolate overflow-hidden bg-surface-invert text-foreground-invert",
        /*
          A photograph needs room to be seen. Without one the navy hero is
          sized by its copy, as before.
        */
        photo && "flex min-h-[min(64svh,560px)] flex-col justify-end lg:min-h-[min(70svh,640px)]",
      )}
    >
      {photo ? (
        <>
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <PropertyImage
              photo={{ ...photo, alt: "" }}
              size={1600}
              sizes={IMAGE_SIZES.fullBleed}
              priority
              aspect="none"
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover"
            />
          </div>
          {/*
            Below 1024px the copy runs the full width and starts near the top,
            where `photo-scrim-hero` is at its lightest (0.35). The 12px
            overline measured 3.42:1 there at 414px. So phones and tablets get
            the home hero's even vertical wash; from 1024px, where both
            measured above AA, the lighter scrim plus a left-weighted wash keep
            more of the photograph visible.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_16_35/0.8)_0%,rgb(7_16_35/0.8)_50%,rgb(7_16_35/0.9)_100%)] lg:hidden"
          />
          <div aria-hidden="true" className="photo-scrim-hero absolute inset-0 -z-10 hidden lg:block" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 hidden bg-[linear-gradient(100deg,rgb(7_16_35/0.55)_0%,rgb(7_16_35/0.3)_50%,transparent_100%)] lg:block"
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-royal-800),var(--color-royal-950))]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(var(--color-azure-600)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-600)_1px,transparent_1px)] [background-size:72px_72px]"
          />
        </>
      )}

      <Container
        className={cn(
          "w-full",
          /*
            Asymmetric on purpose. The section's own `padding-top` already
            clears the hero-sized logo, so a matching top padding here is
            counted twice and reads as an empty band. The bottom is untouched.
          */
          "pt-4 md:pt-6 lg:pt-8",
          size === "sm" && "pb-10 md:pb-14",
          size === "md" && "pb-12 md:pb-18 lg:pb-20",
          size === "lg" && "pb-16 md:pb-24 lg:pb-28",
          aside && "grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12",
        )}
      >
        <div className={cn("flex flex-col gap-5", aside && "lg:col-span-7")}>
          {crumbs ? <Breadcrumbs items={crumbs} invert /> : null}

          {overline ? (
            <p
              data-hero-text=""
              className="self-start text-overline font-semibold tracking-[0.12em] text-azure-400 uppercase"
            >
              {overline}
            </p>
          ) : null}

          <h1 data-hero-text="" className="max-w-[22ch] text-h1 text-foreground-invert">
            {title}
          </h1>

          {lead ? (
            <p
              data-hero-text=""
              className="max-w-[58ch] text-lead text-foreground-invert-muted"
            >
              {lead}
            </p>
          ) : null}

          {children}
        </div>

        {aside ? <div className="lg:col-span-5">{aside}</div> : null}
      </Container>
    </section>
  );
}
