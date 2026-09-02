import * as React from "react";

import { cn } from "@/lib/utils";

type As = "div" | "section" | "header" | "footer" | "main" | "article" | "nav";

/**
 * Page container. 1280px max, gutters 20 / 24 / 32.
 * `prose` narrows to 720px for long-form reading (68ch measure).
 */
export function Container({
  as: Tag = "div",
  width = "page",
  className,
  children,
  ...props
}: {
  as?: As;
  width?: "page" | "prose" | "wide";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        width === "page" && "container-page",
        width === "prose" && "container-prose",
        width === "wide" &&
          "mx-auto w-full max-w-(--container-wide) px-5 md:px-6 xl:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Vertical section rhythm: 48 / 64 / 96.
 * `tone` swaps the ground so alternating sections need no bespoke classes.
 */
export function Section({
  as: Tag = "section",
  tone = "default",
  className,
  children,
  ...props
}: {
  as?: As;
  tone?: "default" | "sunken" | "invert" | "accent";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        "section-y",
        tone === "default" && "bg-background text-foreground",
        tone === "sunken" && "bg-surface-sunken text-foreground",
        tone === "invert" && "bg-surface-invert text-foreground-invert",
        tone === "accent" && "bg-accent-wash text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Overline + heading + optional lead, with consistent spacing everywhere. */
export function SectionHeader({
  overline,
  title,
  lead,
  align = "start",
  invert = false,
  as: Tag = "h2",
  className,
}: {
  overline?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "start" | "center";
  invert?: boolean;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {overline ? (
        <p
          className={cn(
            "text-overline font-semibold tracking-[0.12em] uppercase",
            invert ? "text-gold-400" : "text-accent-quiet",
          )}
        >
          {overline}
        </p>
      ) : null}

      <Tag
        className={cn(
          Tag === "h1" ? "text-h1" : "text-h2",
          invert && "text-foreground-invert",
        )}
      >
        {title}
      </Tag>

      {lead ? (
        <p
          className={cn(
            "max-w-[60ch] text-lead",
            invert ? "text-foreground-invert-muted" : "text-foreground-muted",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
