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
    <section className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-ink-800),var(--color-ink-950))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(var(--color-gold-500)_1px,transparent_1px),linear-gradient(90deg,var(--color-gold-500)_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <Container
        className={cn(
          "flex flex-col gap-5",
          size === "sm" && "py-10 md:py-14",
          size === "md" && "py-12 md:py-18 lg:py-20",
          size === "lg" && "py-16 md:py-24 lg:py-28",
        )}
      >
        {crumbs ? <Breadcrumbs items={crumbs} invert /> : null}

        {overline ? (
          <p className="text-overline font-semibold tracking-[0.12em] text-gold-400 uppercase">
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
