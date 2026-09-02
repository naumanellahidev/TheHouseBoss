"use client";

import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isPending, siteConfig } from "@/lib/site-config";
import { formatPrice } from "@/lib/utils";

/**
 * The mobile action bar on a listing page — docs/04 § 5.
 *
 * Below 1024px the contact card is far down the page, so the two things a
 * visitor actually wants — the price and a way to reach her — stay pinned.
 *
 * `safe-bottom` clears the iOS home indicator; without it the buttons sit under
 * the gesture bar and become unreliable to tap.
 *
 * "Request a showing" scrolls to the form rather than opening a modal: the form
 * is already on the page, and a second copy inside a sheet would mean two
 * inputs with the same label.
 */
export function StickyActionBar({
  price,
  sold,
  formId,
}: {
  price: number;
  sold: boolean;
  formId: string;
}) {
  const phone = isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md safe-bottom lg:hidden">
      <div className="flex items-center gap-3">
        <p className="text-h4 font-semibold text-foreground tabular">
          {formatPrice(price)}
          {sold ? (
            <span className="ml-2 text-xs font-medium text-foreground-muted uppercase">
              Sold
            </span>
          ) : null}
        </p>

        <div className="ml-auto flex gap-2">
          {phone ? (
            <Button asChild variant="outline" size="md">
              <a
                href={
                  siteConfig.contact.phoneHref ||
                  `tel:${phone.replace(/[^\d+]/g, "")}`
                }
                aria-label={`Call ${siteConfig.legalName}`}
              >
                <Phone aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Call</span>
              </a>
            </Button>
          ) : null}

          <Button
            variant="accent"
            size="md"
            onClick={() => {
              const target = document.getElementById(formId);
              target?.scrollIntoView({ behavior: "smooth", block: "center" });
              // Move focus too — scrolling alone leaves a keyboard or screen
              // reader user exactly where they were.
              target?.querySelector<HTMLElement>("input, textarea, a, button")?.focus();
            }}
          >
            {sold ? "Find something similar" : "Request a showing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
