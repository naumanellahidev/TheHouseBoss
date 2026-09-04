import type { Metadata } from "next";

import { siteConfig } from "@/lib/site-config";

/**
 * THE metadata builder. No page hand-writes a title, description or OG tag
 * (docs/08-seo-ai-visibility.md § 5).
 *
 * Length rules are enforced here rather than trusted to discipline: a title
 * that overflows gets truncated on a word boundary and logged in development,
 * so it is caught while writing rather than in a Search Console report.
 */

const SITE = siteConfig.url;

/** 60 including the " | The House Boss" template suffix. */
const TITLE_MAX = 60 - " | The House Boss".length;
const DESC_MIN = 140;
const DESC_MAX = 158;

export type BuildMetadataArgs = {
  title: string;
  description: string;
  /** Absolute path, leading slash. */
  path: string;
  /**
   * Absolute URL or a path under /.
   *
   *   undefined — use the site-wide card
   *   null      — this route has its own `opengraph-image.tsx`; leave it alone
   *   string    — use this exact image
   */
  image?: string | null;
  noindex?: boolean;
  /**
   * A generated or hand-set row from `seo_pages`.
   *
   * Applied over `title` and `description` when present. The row cannot hold an
   * out-of-band description — the table's CHECK constraint enforces 140–158 —
   * so an override is always at least as good as what it replaces. Absent is
   * the normal case and changes nothing.
   */
  override?: {
    title: string | null;
    description: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
    nofollow: boolean;
  } | null;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
};

function truncateOnWord(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:-]+$/, "");
}

function warn(field: string, value: string, detail: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[metadata] ${field} ${detail}: "${value}"`);
  }
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  noindex = false,
  override,
  type = "website",
  publishedTime,
  modifiedTime,
}: BuildMetadataArgs): Metadata {
  const url = absolute(path);

  /*
    The override is applied FIRST, so every check and every derived field below
    sees the value that will actually ship. Applying it afterwards would warn
    about a description the page never renders.

    `||` and not `??`: an override row can exist with a null or empty column
    (a title set, no description), and an empty string there means "not set",
    not "set to nothing".
  */
  title = override?.title || title;
  description = override?.description || description;
  noindex = override?.noindex ?? noindex;

  if (title.length > TITLE_MAX) {
    warn("title", title, `is ${title.length} chars, over ${TITLE_MAX}`);
  }
  if (description.length < DESC_MIN || description.length > DESC_MAX) {
    warn(
      "description",
      description,
      `is ${description.length} chars, outside ${DESC_MIN}–${DESC_MAX}`,
    );
  }

  /**
   * Which social card this page gets.
   *
   * Next resolves `opengraph-image.tsx` for the page in its OWN segment and
   * does not cascade to descendants the way the docs imply, so this cannot be
   * left to the file convention alone: routes that have their own card pass
   * `image: null` to stand aside, and everything else falls back to the
   * site-wide card explicitly. Relying on the cascade silently left the home
   * page and every guide with no og:image at all.
   */
  const ogImage =
    image === null
      ? null
      : image
        ? image.startsWith("http")
          ? image
          : absolute(image)
        : `${SITE}/opengraph-image`;

  return {
    title: truncateOnWord(title, TITLE_MAX),
    description: truncateOnWord(description, DESC_MAX),
    alternates: { canonical: override?.canonicalUrl || url },
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] }
        : {}),
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function absolute(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Legal pages: real content, deliberately kept out of the index. */
export function legalMetadata(title: string, description: string, path: string) {
  return buildMetadata({ title, description, path, noindex: true });
}
