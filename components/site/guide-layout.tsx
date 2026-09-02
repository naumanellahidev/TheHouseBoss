import * as React from "react";

import { Container, Section } from "@/components/site/container";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { LeadForm } from "@/components/site/lead-form";
import { PageHero } from "@/components/site/page-hero";
import { Prose } from "@/components/site/prose";
import {
  MobileToc,
  TableOfContents,
  type TocItem,
} from "@/components/site/table-of-contents";
import type { Crumb } from "@/components/site/breadcrumbs";
import type { LeadType } from "@/types/domain";
import type { FaqItem } from "@/types/domain";

/**
 * Shared shell for the long-form guides.
 *
 * Layout per docs/04-responsive-spec.md § 5:
 *   mobile  — progress bar + collapsible TOC pinned under the header
 *   ≥1024px — sticky sidebar TOC in 3/12, content in 9/12 capped at 68ch
 *
 * A lead-capture block appears after the opening section and again at the end,
 * as specified in docs/05-page-specs.md.
 */
export function GuideLayout({
  overline,
  title,
  lead,
  crumbs,
  toc,
  faq,
  leadType,
  ctaHeading,
  ctaDescription,
  children,
  aside,
}: {
  overline?: string;
  title: string;
  lead: string;
  crumbs: Crumb[];
  toc: TocItem[];
  faq?: FaqItem[];
  leadType: LeadType;
  ctaHeading: string;
  ctaDescription: string;
  children: React.ReactNode;
  /** Optional block under the sidebar TOC, e.g. current matching listings. */
  aside?: React.ReactNode;
}) {
  return (
    <>
      <PageHero
        overline={overline}
        title={title}
        lead={lead}
        crumbs={crumbs}
        size="md"
      />

      <Container>
        <MobileToc items={toc} />
      </Container>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-[calc(var(--header-h-lg)+1.5rem)] flex flex-col gap-8">
              <TableOfContents items={toc} />
              {aside}
            </div>
          </aside>

          <div className="lg:col-span-9">
            <Prose>{children}</Prose>

            {faq && faq.length > 0 ? (
              <section
                id="faq"
                aria-labelledby="faq-heading"
                className="mt-14 max-w-[68ch] scroll-mt-28"
              >
                <h2 id="faq-heading" className="text-h2">
                  Common questions
                </h2>
                <FaqAccordion items={faq} defaultOpenFirst className="mt-6" />
              </section>
            ) : null}

            <div className="mt-14 max-w-[68ch]">
              <LeadForm
                leadType={leadType}
                heading={ctaHeading}
                description={ctaDescription}
                compact
                submitLabel="Send message"
              />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
