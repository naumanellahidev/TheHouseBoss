import * as React from "react";

import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { Container } from "@/components/site/container";
import { cn } from "@/lib/utils";

/**
 * Standard hero for content pages.
 *
 * The navy ground with a faint architectural grid is the placeholder used
 * everywhere until the client's photography arrives — deliberate, not a grey
 * box. Pass `photo` in Phase 5+ once real images exist.
 */
export function PageHero({
  overline,
  title,
  lead,
  crumbs,
  children,
  size = "md",
}: {
  overline?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  crumbs?: Crumb[];
  children?: React.ReactNode;
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
      className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-royal-800),var(--color-royal-950))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(var(--color-azure-600)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-600)_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <Container
        className={cn(
          "flex flex-col gap-5",
          /*
            Asymmetric on purpose. The section's own `padding-top` already
            clears the hero-sized logo, so a matching top padding here is
            counted twice and reads as an empty band. The bottom is untouched.
          */
          "pt-4 md:pt-6 lg:pt-8",
          size === "sm" && "pb-10 md:pb-14",
          size === "md" && "pb-12 md:pb-18 lg:pb-20",
          size === "lg" && "pb-16 md:pb-24 lg:pb-28",
        )}
      >
        {crumbs ? <Breadcrumbs items={crumbs} invert /> : null}

        {overline ? (
          <p className="text-overline font-semibold tracking-[0.12em] text-azure-400 uppercase">
            {overline}
          </p>
        ) : null}

        <h1 className="max-w-[22ch] text-h1 text-foreground-invert">{title}</h1>

        {lead ? (
          <p className="max-w-[58ch] text-lead text-foreground-invert-muted">
            {lead}
          </p>
        ) : null}

        {children}
      </Container>
    </section>
  );
}
