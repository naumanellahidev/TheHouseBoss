import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/lib/queries/settings";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { isPending, siteConfig } from "@/lib/site-config";
import type { LeadType } from "@/types/domain";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Contact Krisi Kakarova",
  description:
    "Get in touch with Krisi Kakarova — The House Boss, Lake Mary. Realtor and Certified Residential Building Contractor serving Lake Mary, Longwood, Sanford, Casselberry and Orlando.",
  path: "/contact",
});

/**
 * `/contact` — docs/05.
 *
 * Contact methods FIRST, form second. Someone who wants to phone should not
 * have to scroll past a form to find the number.
 *
 * Anything the client has not supplied yet is hidden rather than rendered as a
 * placeholder: a dead `tel:` link is worse than no link. Settings edited in the
 * admin win over the compile-time fallback.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string }>;
}) {
  const { interest } = await searchParams;
  const settings = await safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings");

  const phone =
    settings.phone ?? (isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone);
  const email =
    settings.email ?? (isPending(siteConfig.contact.email) ? null : siteConfig.contact.email);
  const hours = settings.officeHours ?? siteConfig.contact.hours;

  const street = settings.address.street;
  const locality = settings.address.locality ?? siteConfig.contact.address.locality;
  const region = settings.address.region ?? siteConfig.contact.address.region;
  const postal = settings.address.postalCode;

  const LEAD_TYPES: LeadType[] = [
    "general",
    "listing_inquiry",
    "showing_request",
    "seller",
    "va",
    "assumable",
    "new_construction",
  ];
  const leadType = LEAD_TYPES.includes(interest as LeadType)
    ? (interest as LeadType)
    : "general";

  const crumbs = [{ href: "/contact", label: "Contact" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Get in touch</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            I answer every message myself. If it is straightforward you will
            usually hear back the same business day, and if it is complicated you
            will hear back properly rather than quickly.
          </p>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Contact methods first — docs/05. */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <ul className="flex flex-col gap-3">
              {phone ? (
                <li>
                  <a
                    href={
                      settings.phone
                        ? `tel:${settings.phone.replace(/[^\d+]/g, "")}`
                        : siteConfig.contact.phoneHref
                    }
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface p-4 text-body font-medium text-foreground transition-colors duration-(--dur-fast) hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Phone className="size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
                    {phone}
                  </a>
                </li>
              ) : null}

              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface p-4 text-body font-medium break-all text-foreground transition-colors duration-(--dur-fast) hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Mail className="size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>

            <dl className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
              <div className="flex gap-3">
                <dt className="sr-only">Service area</dt>
                <MapPin className="mt-0.5 size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
                <dd className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    Service area
                  </span>
                  <span className="text-sm text-foreground-muted">
                    {siteConfig.searchCities.map((city) => city.name).join(", ")},
                    and the rest of Seminole County.
                  </span>
                  {street ? (
                    <address className="mt-2 text-sm text-foreground-muted not-italic">
                      {street}
                      <br />
                      {locality}, {region} {postal ?? ""}
                    </address>
                  ) : null}
                </dd>
              </div>

              <div className="flex gap-3 border-t border-border pt-4">
                <dt className="sr-only">Hours</dt>
                <Clock className="mt-0.5 size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
                <dd className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">Hours</span>
                  <span className="text-sm text-foreground-muted">{hours}</span>
                </dd>
              </div>
            </dl>

            {!phone && !email ? (
              <p className="rounded-lg border border-dashed border-border bg-surface-sunken p-4 text-sm text-foreground-muted">
                The form is the fastest way to reach me at the moment — it comes
                straight to my inbox.
              </p>
            ) : null}
          </div>

          <div className="lg:col-span-7">
            <LeadForm
              leadType={leadType}
              heading="Send a message"
              description="The more you tell me, the more useful my first reply will be."
              submitLabel="Send message"
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
