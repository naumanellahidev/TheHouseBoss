import Link from "next/link";

import { PropertyImage } from "@/components/site/property-image";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import type { SiteSettings } from "@/types/domain";

/**
 * Brand lockup.
 *
 * NOTE: this is the marketing lockup, NOT the legal disclosure. The FREC
 * brokerage-size rule applies to `<ComplianceFooter />`, which is a separate
 * component and must not be conflated with this one.
 *
 * ── The artwork ───────────────────────────────────────────────────────────
 *
 * The logo is UPLOADED THROUGH THE ADMIN, not committed to the repository. It
 * lives in `site_settings.logo_key` and goes through the same sharp pipeline as
 * every other image on this site, so it gets 400/800/1600 WebP derivatives, a
 * blur placeholder and stored dimensions for free.
 *
 * That replaces the previous `public/logo/*.png` + `HAS_ARTWORK` arrangement,
 * which required somebody to put a file in the repo and flip a constant. A
 * client cannot do that; uploading an image in a dashboard is something they do
 * every day.
 *
 * With no key set, the type-set lockup below renders — so the site never shows
 * a broken image and never waits on an asset.
 *
 * ── Sizing ───────────────────────────────────────────────────────────────
 *
 * The height comes from the `--logo-h-*` tokens and the width from the image's
 * own ratio, read from `media` through the public view. It used to be a fixed
 * 44px box at an assumed 3:2 — too small for a lockup that carries the
 * licensee and brokerage lines, and the wrong shape for any logo that is not
 * 3:2. Rendered `bare`, so nothing is painted behind a transparent PNG.
 *
 * ── Why the image carries no text alternative of its own ──────────────────
 *
 * The artwork is a wordmark: it *is* the words "The House Boss". Its alt text
 * is therefore the brand name, and the sub-line is rendered as real text beside
 * it rather than baked into the picture, so it stays selectable, translatable
 * and legible to a screen reader.
 */

/**
 * Compact mark for tight spaces — the header at narrow widths, a favicon, an
 * avatar slot. Kept as SVG so it stays crisp at any size and costs nothing.
 */
export function LogoMark({
  className,
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="3"
        fill={invert ? "transparent" : "var(--color-royal-900)"}
        stroke="var(--color-azure-600)"
        strokeWidth="2"
      />
      <path
        d="M9 19.5 20 11l11 8.5"
        fill="none"
        stroke="var(--color-azure-600)"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <text
        x="20"
        y="30"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        letterSpacing="0.5"
        fill="var(--color-porcelain-50)"
        fontFamily="var(--font-body)"
      >
        THB
      </text>
    </svg>
  );
}

export function Logo({
  variant = "full",
  invert = false,
  tone = "fixed",
  href = "/",
  className,
  settings,
}: {
  variant?: "full" | "compact" | "stacked";
  invert?: boolean;
  /**
   * `"auto"` renders BOTH uploaded marks and lets CSS choose between them by
   * the background the bar is currently over. For the site header, which starts
   * transparent on a dark hero and acquires a light background on scroll.
   *
   * Everywhere else is `"fixed"`: the footer is always navy and the admin
   * sidebar is always navy, so they say so with `invert` and render one image.
   */
  tone?: "fixed" | "auto";
  href?: string | null;
  className?: string;
  /** Live branding. Absent → the type-set lockup from site-config. */
  settings?: SiteSettings | null;
}) {
  const brandName = settings?.brandName ?? siteConfig.name;

  /*
    An inverted logo is used only when one was supplied. Falling back to the
    light artwork on a dark ground is better than falling back to no logo, and
    most brand marks carry enough contrast to survive it.
  */
  const artworkKey = invert
    ? (settings?.logoInvertKey ?? settings?.logoKey)
    : settings?.logoKey;

  /*
    The artwork's REAL dimensions, from `media` via the public view (migration
    016). This was a hardcoded 900×600 — a guess that happened to be wrong for
    the logo that was actually uploaded (612×408 is 3:2, but nothing guarantees
    the next one is), and a wrong ratio inside a fixed frame is what letterboxed
    the mark and left it looking pasted onto a card.

    The 3:2 fallback survives for the window between an upload and the view
    catching up, which is the only case where a key exists and a size does not.
  */
  const artworkW = (invert ? settings?.logoInvertW : settings?.logoW) ?? 900;
  const artworkH = (invert ? settings?.logoInvertH : settings?.logoH) ?? 600;

  /*
    Height per context, width from the aspect ratio, capped so a wide lockup
    cannot push the primary nav off the bar. Tokens, because these are only
    correct in proportion to `--header-h`, which is also a token.
  */
  /*
    The height goes on the IMAGE and the width cap on its wrapper.

    Putting the height on the wrapper looked identical until the plate below was
    added: padding then ate into a fixed box, shrinking the mark, and because a
    flex child stretches by default the card ran the full width of the footer
    column with the logo adrift at its left edge. Height on the image, `w-fit`
    on the wrapper, and the card is exactly as big as what it holds.
  */
  const artworkHeight =
    variant === "compact"
      ? "h-(--logo-h)"
      : variant === "stacked"
        ? "h-(--logo-h-stacked)"
        : invert
          ? "h-(--logo-h) md:h-(--logo-h-footer)"
          : "h-(--logo-h) md:h-(--logo-h-md) lg:h-(--logo-h-lg)";

  const artworkMaxWidth =
    variant === "compact" ? "max-w-(--logo-max-w-compact)" : "max-w-(--logo-max-w)";

  /*
    NOTHING is painted behind the logo. Ever.

    Two earlier versions got this wrong in opposite directions. `PropertyImage`
    paints `bg-surface-sunken` behind photography, which showed through the
    transparent artwork as a grey rectangle — an accident. Replacing it with a
    deliberate white card to keep the light-on-dark artwork readable was a
    considered choice, and the client rejected it: the logo is to sit directly
    on whatever is behind it, with no plate.

    The consequence is real and accepted. The supplied artwork is gold and navy
    drawn for a white page, so on the navy footer the gold reads and the two
    navy sub-lines do not. The fix is a light-text version uploaded to
    `logo_invert_key` in Admin → Settings → Branding, which this component
    already prefers whenever one exists.
  */

  /*
    The type-set lockup.

    Extracted from the ternary into a value because it is now used TWICE: when
    no artwork has been uploaded, and when uploaded artwork fails to load. The
    second case is the one that bit — a failed image left the header's home link
    with no content at all, which axe reported as a serious `link-name`
    violation and the responsive audit caught as a 0x44 touch target. Rendering
    nothing is right for a decorative photograph and wrong for a link's only
    label.
  */
  /*
    The two data attributes are the header's hook for re-colouring the type-set
    fallback while it is transparent over a dark hero (app/globals.css). They
    do nothing anywhere else, and they are attributes rather than classes so
    the rule survives any change to the class list.
  */
  const typeSet = (
    <>
      <span
        data-logo-type=""
        className={cn(
          "font-display leading-none font-semibold tracking-[0.06em] uppercase",
          variant === "compact" ? "text-base" : "text-lg md:text-xl",
          invert ? "text-foreground-invert" : "text-foreground",
        )}
      >
        {brandName}
      </span>

      {variant !== "compact" ? (
        <span
          data-logo-sub=""
          className={cn(
            "flex items-center gap-2 text-xs leading-none font-medium",
            invert ? "text-foreground-invert-muted" : "text-foreground-subtle",
          )}
        >
          <span aria-hidden="true" className="block h-0.5 w-8 bg-accent" />
          Powered by {settings?.brokerageName ?? siteConfig.brokerage}
        </span>
      ) : null}
    </>
  );

  /** One piece of artwork. */
  const artwork = (key: string, w: number, h: number) => (
    <PropertyImage
      key={key}
      photo={{
        kind: "stored",
        key,
        w,
        h,
        // The artwork is a wordmark, so its alt IS the brand name and it is
        // what names the link. `fallback` covers it never arriving.
        alt: brandName,
      }}
      /*
        800, not 400. The logo now renders up to 96px tall in the footer and
        80px in the header, and the `sizes` below are the WIDTH CAPS from
        `--logo-max-w-compact` / `--logo-max-w` rather than a guess at the
        rendered width — because the width depends on the uploaded artwork's
        ratio, which is not known here. Declaring the cap is the only figure
        that cannot under-request, and `sizes` still lets the loader drop back
        to the 400 wherever the box is genuinely small.

        A SQUARE upload therefore renders as a full square at the header's
        height, which is what fills the bar; a wide lockup renders wide and is
        held to the cap so it cannot push the nav off the bar. Neither is ever
        stretched — `object-contain` and `w-auto` keep the file's own ratio.
      */
      size={800}
      sizes="(max-width: 1023px) 176px, 240px"
      priority
      aspect="none"
      bare
      fallback={typeSet}
      wrapperClassName={cn("w-fit self-start", artworkMaxWidth)}
      className={cn(artworkHeight, "w-auto object-contain")}
    />
  );

  /**
   * The same artwork, labelled with the background it was drawn for.
   *
   * A wrapping span rather than a prop on `PropertyImage`: that component has a
   * closed prop list on purpose, and widening a shared image component so one
   * caller can hang a CSS hook on it would be the wrong trade. The span keeps
   * `w-fit self-start` because a flex child stretches by default, and a
   * stretched wrapper is what once left the footer mark adrift at the left edge
   * of a full-width card.
   */
  const labelled = (
    forGround: "light" | "dark",
    key: string,
    w: number,
    h: number,
  ) => (
    <span data-logo-art={forGround} className="w-fit self-start">
      {artwork(key, w, h)}
    </span>
  );

  /*
    ── Two marks, when there are two ─────────────────────────────────────────

    `tone="auto"` is the header's case and only the header's. The bar is
    transparent over a dark hero and light once it has scrolled, so the artwork
    under it changes background halfway down the page — and the mark drawn for a
    white page has black lettering that disappears on navy.

    Both are rendered and CSS chooses, because the swap happens on scroll and a
    server component cannot know where the reader is. The second image costs a
    request ONLY when a dark-background logo has actually been uploaded; with
    just the one key this renders exactly what it rendered before.
  */
  const hasBoth = Boolean(settings?.logoKey && settings?.logoInvertKey);

  const inner =
    tone === "auto" && hasBoth ? (
      <>
        {labelled(
          "light",
          settings!.logoKey!,
          settings?.logoW ?? 900,
          settings?.logoH ?? 600,
        )}
        {labelled(
          "dark",
          settings!.logoInvertKey!,
          settings?.logoInvertW ?? 900,
          settings?.logoInvertH ?? 600,
        )}
      </>
    ) : artworkKey ? (
      artwork(artworkKey, artworkW, artworkH)
    ) : (
      typeSet
    );

  const layout = cn(
    "flex min-w-0",
    variant === "stacked"
      ? "flex-col items-center gap-2 text-center"
      : "flex-col gap-1",
  );

  /*
    `className` goes on the OUTERMOST element, which is the link when there is
    one — not on an inner wrapper.

    The header renders two of these, one `lg:hidden` and one
    `hidden lg:inline-flex`. With the class on an inner span, the <a> stayed
    visible while its only text was display:none, and axe correctly reported
    "Links must have discernible text" on every page. A link whose label is
    hidden is a link a screen reader announces as nothing.
  */
  /*
    `data-logo` marks the outermost element of the lockup, whichever it is.

    It is what `app/globals.css` reaches for to grow the mark to hero size on a
    page with a dark hero and shrink it back on scroll. An attribute rather than
    a class because the class list here is composed from three conditionals and
    a caller-supplied `className`, any of which could stop carrying a marker
    class without anything failing loudly.
  */
  if (!href) {
    return (
      <span data-logo="" className={cn(layout, className)}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      data-logo=""
      href={href}
      // No aria-label: the visible text (or the image's alt) already names the
      // link, and an aria-label that differs from visible text fails WCAG 2.5.3.
      className={cn(
        layout,
        /*
          `min-h-11` is 44px, the minimum touch target (docs/03 § 9).

          Moving the layout classes onto the link fixed the missing accessible
          name but made the link only 24px tall in the `compact` variant, which
          has no sub-line under the wordmark. The responsive audit caught it at
          six widths. The logo is the primary way home on a phone — it owes the
          same target as any other control.
        */
        "min-h-11 justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      {inner}
    </Link>
  );
}
