"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, Menu, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { isGroup, primaryNav, type NavEntry } from "@/lib/nav";
import { isPending, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Below 1024px the whole navigation lives in a right-anchored full-height
 * sheet: focus trapped, Escape closes, body scroll locked (Radix Dialog).
 * Rows are 56px tall; the primary CTA is pinned to the bottom.
 * docs/04-responsive-spec.md § 3.
 */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on navigation. Adjusting state during render (rather than in an
  // effect) avoids a cascading second render — react.dev/learn/you-might-not-
  // need-an-effect
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const hasPhone = !isPending(siteConfig.contact.phone);
  const hasEmail = !isPending(siteConfig.contact.email);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="lg:hidden"
        >
          <Menu className="size-6" aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        title="Menu"
        description="Site navigation and contact options"
      >
        <nav
          aria-label="Mobile"
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-2"
        >
          <ul className="flex flex-col">
            {primaryNav.map((entry) => (
              <MobileNavRow key={labelOf(entry)} entry={entry} />
            ))}
          </ul>
        </nav>

        <div className="border-t border-border-invert px-5 pt-4 safe-bottom">
          <Button variant="accent" size="lg" block asChild>
            <Link href="/contact">Contact Krisi</Link>
          </Button>

          {(hasPhone || hasEmail) && (
            <div className="mt-4 flex flex-col gap-3 pb-1 text-sm">
              {hasPhone && (
                <a
                  href={siteConfig.contact.phoneHref}
                  className="flex min-h-11 items-center gap-3 text-foreground-invert-muted transition-colors hover:text-foreground-invert"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {siteConfig.contact.phone}
                </a>
              )}
              {hasEmail && (
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="break-anywhere flex min-h-11 items-center gap-3 text-foreground-invert-muted transition-colors hover:text-foreground-invert"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {siteConfig.contact.email}
                </a>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function labelOf(entry: NavEntry) {
  return isGroup(entry) ? entry.label : entry.label;
}

function MobileNavRow({ entry }: { entry: NavEntry }) {
  const [expanded, setExpanded] = React.useState(false);

  if (!isGroup(entry)) {
    return (
      <li className="border-b border-border-invert">
        <Link
          href={entry.href}
          className="flex min-h-14 items-center text-h4 font-semibold text-foreground-invert transition-colors hover:text-accent-invert"
        >
          {entry.label}
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b border-border-invert">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-h4 font-semibold text-foreground-invert transition-colors hover:text-accent-invert"
      >
        {entry.label}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 text-accent-invert transition-transform duration-(--dur-base) ease-(--ease-out)",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <ul className="flex flex-col border-l border-border-invert pb-3 pl-4">
          {entry.href && (
            <li>
              <Link
                href={entry.href}
                className="flex min-h-11 items-center text-sm font-medium text-accent-invert"
              >
                All {entry.label}
              </Link>
            </li>
          )}
          {entry.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center text-sm text-foreground-invert-muted transition-colors hover:text-foreground-invert"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
