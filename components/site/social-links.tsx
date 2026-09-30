import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  LinkedinIcon,
  ListingSiteIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@/components/site/social-icons";
import { isPending, siteConfig } from "@/lib/site-config";
import type { SiteSettings } from "@/types/domain";

/**
 * The client's profile links, resolved once and shared.
 *
 * ── Why this is not just the footer's business ────────────────────────────
 *
 * Three surfaces need the same answer to "which profiles are live": the footer,
 * the contact page, and the `sameAs` array in the JSON-LD graph. They had three
 * copies of the merge, and the JSON-LD one was the only one that read the
 * admin's values — so adding an Instagram URL in Settings changed the structured
 * data and nothing a visitor could see.
 *
 * ── Precedence ───────────────────────────────────────────────────────────
 *
 * Admin → Settings wins, site-config is the fallback, and a `PENDING`
 * placeholder is not a link. A profile the client has not opened yet must never
 * render as a dead icon, and must never appear in `sameAs` — a false identity
 * claim is worse for corroboration than a missing one.
 */

const ICONS = {
  googleBusiness: GoogleIcon,
  realtorDotCom: ListingSiteIcon,
  zillow: ListingSiteIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TiktokIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
} as const;

const LABELS: Record<string, string> = {
  googleBusiness: "Google Business Profile",
  realtorDotCom: "Realtor.com",
  zillow: "Zillow",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

export type LiveProfile = {
  key: string;
  url: string;
  label: string;
  Icon: (typeof ICONS)[keyof typeof ICONS];
};

/**
 * Every profile with a real URL, in a stable order.
 *
 * The order is `ICONS`' order rather than the object's, because `Object.entries`
 * over a merge of two records puts whichever key the admin edited last wherever
 * it happens to land — and a row of icons that reorders itself between two
 * deploys is the kind of change nobody can explain afterwards.
 */
export function liveProfiles(settings?: SiteSettings | null): LiveProfile[] {
  const merged: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(siteConfig.profiles).filter(([, url]) => !isPending(url)),
    ),
    ...(settings?.profiles ?? {}),
  };

  return (Object.keys(ICONS) as (keyof typeof ICONS)[])
    .filter((key) => merged[key]?.trim())
    .map((key) => ({
      key,
      url: merged[key].trim(),
      label: LABELS[key] ?? key,
      Icon: ICONS[key],
    }));
}

/**
 * The profiles as a labelled list, for a page with room for words.
 *
 * The footer shows icons alone, because there it is a row of six in a dark strip
 * and the accessible name is on the anchor. Here the name is visible: somebody on
 * the contact page is deciding which way to reach her, and "Instagram" is the
 * information, not the glyph.
 *
 * `rel="me"` on every link. It is what tells a crawler that the site and the
 * profile are the same person, which is the whole point of listing them.
 */
export function SocialLinks({
  settings,
  heading = "Follow along",
  description = "The same day-to-day: listings as they come up, walkthroughs, and what the local market is actually doing.",
}: {
  settings?: SiteSettings | null;
  heading?: string;
  description?: string;
}) {
  const profiles = liveProfiles(settings).filter(
    // The Google profile has its own card wherever this is used, and repeating
    // it under a heading about following along misdescribes what it is.
    (profile) => profile.key !== "googleBusiness",
  );

  if (profiles.length === 0) return null;

  return (
    <section
      aria-labelledby="social-links-heading"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="social-links-heading" className="text-sm font-semibold text-foreground">
          {heading}
        </h2>
        <p className="text-sm text-foreground-muted">{description}</p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {profiles.map(({ key, url, label, Icon }) => (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer me"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-(--dur-fast) hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Icon className="size-4 shrink-0 text-accent-quiet" />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
