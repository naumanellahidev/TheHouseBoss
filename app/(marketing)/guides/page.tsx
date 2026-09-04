import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileSignature, HardHat, Home } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Guides for Central Florida Buyers & Sellers",
  description:
    "Long-form guides to VA loans, assumable mortgages, new-construction representation and selling in Central Florida — written to answer the question, not to collect an email address.",
  path: "/guides",
});

/**
 * `/guides` — the index docs/05 lists as task 12.
 *
 * Hand-written rather than generated from the `articles` table: these four are
 * the pillar pages the whole AI-visibility argument rests on (docs/08 § 1), and
 * each is a route of its own rather than a row. When a fifth pillar is written,
 * it is added here deliberately.
 */
const GUIDES = [
  {
    href: "/guides/va-home-buyer",
    icon: Home,
    title: "VA home-buyer guide",
    lead: "Entitlement, zero down, the funding fee, and the Minimum Property Requirements that quietly end VA deals in Central Florida.",
    detail: "The longest guide on the site. The MPR section is the one to read before you write an offer.",
  },
  {
    href: "/assumable-mortgage-homes",
    icon: FileSignature,
    title: "Assumable mortgage homes",
    lead: "Taking over a low-rate VA, FHA or USDA loan — which loans qualify, the equity gap, and what actually goes wrong.",
    detail: "Work out the gap between the price and the loan balance first. Everything else follows from that number.",
  },
  {
    href: "/new-construction-representation",
    icon: HardHat,
    title: "New-construction representation",
    lead: "Why the sales office works for the builder, and why registering your own agent before your first visit matters more than anything else.",
    detail: "The one thing to do before you visit a model home. It takes a single message.",
  },
];

export default function GuidesIndexPage() {
  const crumbs = [{ href: "/guides", label: "Guides" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Guides</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            Four long answers to the questions I get asked most. They are written
            to be useful whether or not you ever call me — there is no form in
            the way and nothing held back for a consultation.
          </p>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {GUIDES.map((guide) => (
              <li key={guide.href}>
                <Link
                  href={guide.href}
                  className={cn(
                    "group flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-6 shadow-sm",
                    "transition-[box-shadow,transform] duration-(--dur-base)",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-accent-wash text-accent-quiet"
                  >
                    <guide.icon className="size-5" />
                  </span>

                  <span className="text-h3 text-foreground">{guide.title}</span>
                  <span className="text-body leading-relaxed text-foreground-muted">
                    {guide.lead}
                  </span>
                  <span className="mt-auto border-t border-border pt-3 text-sm text-foreground-subtle">
                    {guide.detail}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-quiet">
                    Read it
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
