import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

import { RetryButton } from "@/app/offline/retry-button";
import { Container, Section } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { isPending } from "@/lib/site-config";

/**
 * What an offline tap lands on.
 *
 * ── Why it is outside the marketing layout ────────────────────────────────
 *
 * That layout renders the header, the footer and the compliance block, and the
 * compliance block is required on every PUBLIC page (CLAUDE.md § 3 rule 15).
 * This is not one: it is a fallback the service worker serves when the network
 * is gone, it is `noindex`, and it is never a page anybody is sent to. Rendering
 * the chrome here would mean fetching an uploaded logo over a connection that
 * has already failed.
 *
 * ── Why it carries the phone number ───────────────────────────────────────
 *
 * It is the one piece of the site that still works with no connection. Somebody
 * standing outside a property with no signal does not need an apology, they need
 * the number — and a `tel:` link uses the cell network rather than data.
 */

export const metadata: Metadata = {
  title: "You are offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  const phone = isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone;

  return (
    <Section>
      <Container className="flex max-w-prose flex-col items-start gap-5 py-10">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-sunken">
          <WifiOff className="size-6 text-foreground-muted" aria-hidden="true" />
        </span>

        <h1 className="text-h1">No connection</h1>

        <p className="text-lead text-foreground-muted">
          This page needs the network and the network is not there. Nothing is
          lost — anything you had already opened is still in the app, and the
          moment you are back online it will load normally.
        </p>

        <div className="flex flex-wrap gap-3">
          <RetryButton />

          {phone ? (
            <Button asChild variant="outline">
              <a href={siteConfig.contact.phoneHref}>Call {phone}</a>
            </Button>
          ) : null}
        </div>

        <p className="text-sm text-foreground-subtle">
          <Link href="/" className="underline underline-offset-4">
            {siteConfig.name}
          </Link>{" "}
          — {siteConfig.legalName}, {siteConfig.licenses.realEstate.label}{" "}
          {siteConfig.licenses.realEstate.number}.
        </p>
      </Container>
    </Section>
  );
}
