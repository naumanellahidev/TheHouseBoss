import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { RenderedLink } from "@/lib/queries/links";

/**
 * The internal links a page carries (brief §16, §39).
 *
 * ── Why they are visible and not hidden in the prose ──────────────────────
 *
 * The tempting version of "internal linking for SEO" injects anchors into the
 * body copy. That rewrites the agent's own words to suit a crawler, and it puts
 * a link somewhere the reader did not ask for one. This block is a plain,
 * labelled list at the end of the page: a reader who has finished looking at
 * the property and wants to know where to go next is the person it is for, and
 * a crawler reads it the same way.
 *
 * ── Why every anchor is the target's own name ─────────────────────────────
 *
 * The engine takes the anchor from the page being linked to — a community's
 * name, a listing's address, the guide's title. Not a keyword. An anchor
 * stuffed with the phrase you want to rank for is the oldest over-optimisation
 * there is, and §14 rules it out.
 */
export function RelatedLinks({
  links,
  heading = "Where to next",
}: {
  links: RenderedLink[];
  heading?: string;
}) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-labelledby="related-links-heading"
      className="flex flex-col gap-4 border-t border-border pt-8"
    >
      <h2
        id="related-links-heading"
        className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase"
      >
        {heading}
      </h2>

      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {links.map((link) => (
          <li key={`${link.href}-${link.anchor}`}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center gap-1.5 text-lead font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {link.anchor}
              <ArrowUpRight
                className="size-4 shrink-0 text-accent-quiet"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
