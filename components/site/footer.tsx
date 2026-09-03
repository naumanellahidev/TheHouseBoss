import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { ComplianceFooter } from "@/components/site/compliance-footer";
import { Logo } from "@/components/site/logo";
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  LinkedinIcon,
  ListingSiteIcon,
} from "@/components/site/social-icons";
import { footerNav, legalNav } from "@/lib/nav";
import { isPending, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const socialIcons = {
  googleBusiness: GoogleIcon,
  realtorDotCom: ListingSiteIcon,
  zillow: ListingSiteIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
} as const;

const profileLabels: Record<string, string> = {
  googleBusiness: "Google Business Profile",
  realtorDotCom: "Realtor.com",
  zillow: "Zillow",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export function Footer() {
  const { contact, profiles } = siteConfig;
  const hasPhone = !isPending(contact.phone);
  const hasEmail = !isPending(contact.email);

  const liveProfiles = Object.entries(profiles).filter(
    ([, url]) => !isPending(url),
  );

  return (
    <footer className="mt-auto bg-surface-invert text-foreground-invert-muted">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-16">
        {/* ── Brand ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 sm:col-span-2 lg:col-span-1">
          <Logo variant="full" invert />

          <p className="max-w-[36ch] text-sm leading-relaxed">
            {siteConfig.positioning}
          </p>

          {liveProfiles.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2">
              {liveProfiles.map(([key, url]) => {
                const Icon = socialIcons[key as keyof typeof socialIcons];
                return (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      aria-label={profileLabels[key] ?? key}
                      className={cn(
                        "inline-flex size-11 items-center justify-center rounded-md",
                        "text-foreground-invert-muted transition-colors duration-(--dur-fast)",
                        "hover:bg-royal-800 hover:text-accent-invert",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-invert",
                      )}
                    >
                      {Icon ? (
                        <Icon className="size-5" aria-hidden="true" />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="text-xs font-semibold"
                        >
                          {profileLabels[key]?.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Link columns ───────────────────────────────────────────── */}
        {footerNav.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h2 className="text-overline font-semibold tracking-[0.12em] text-accent-invert uppercase">
              {col.heading}
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {col.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "inline-flex min-h-9 items-center py-1 text-sm",
                      "transition-colors duration-(--dur-fast)",
                      "hover:text-foreground-invert",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ── Contact strip ────────────────────────────────────────────── */}
      {(hasPhone || hasEmail) && (
        <div className="border-t border-royal-800">
          <div className="container-page flex flex-col gap-4 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-8">
            {hasPhone && (
              <a
                href={contact.phoneHref}
                className="inline-flex min-h-11 items-center gap-2.5 text-sm transition-colors hover:text-foreground-invert"
              >
                <Phone className="size-4 text-accent-invert" aria-hidden="true" />
                {contact.phone}
              </a>
            )}
            {hasEmail && (
              <a
                href={`mailto:${contact.email}`}
                className="break-anywhere inline-flex min-h-11 items-center gap-2.5 text-sm transition-colors hover:text-foreground-invert"
              >
                <Mail className="size-4 text-accent-invert" aria-hidden="true" />
                {contact.email}
              </a>
            )}
            <span className="inline-flex min-h-11 items-center gap-2.5 text-sm">
              <MapPin className="size-4 text-accent-invert" aria-hidden="true" />
              Serving Lake Mary &amp; Central Florida
            </span>
          </div>
        </div>
      )}

      {/* ── Legal nav ────────────────────────────────────────────────── */}
      <div className="border-t border-royal-800">
        <div className="container-page py-5">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 items-center text-xs transition-colors hover:text-foreground-invert"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Legally required disclosure ──────────────────────────────── */}
      <ComplianceFooter />
    </footer>
  );
}
