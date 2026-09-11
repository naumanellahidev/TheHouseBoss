import { ExternalLink, Star } from "lucide-react";

import { GoogleIcon } from "@/components/site/social-icons";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The Google Business Profile, as two actions a visitor can take.
 *
 * Reviews on the profile are the single strongest local-ranking signal a
 * service-area business controls, and the only reliable way to get them is to
 * hand a happy client the direct link. `reviewUrl` opens Google's review
 * composer for this exact profile — no searching, no picking the wrong
 * "House Boss" out of a list.
 *
 * Server component, no JavaScript. Both links leave the site, so both say so:
 * visibly with an icon, and to assistive tech with the "(opens Google)" text.
 */
export function GoogleProfileCard({
  className,
  heading = "Find The House Boss on Google",
  description = "See my profile, or leave a review if we have worked together. A review there helps the next buyer or seller find someone they can trust.",
}: {
  className?: string;
  heading?: string;
  description?: string;
}) {
  const { mapsUrl, reviewUrl } = siteConfig.google;

  return (
    <section
      aria-labelledby="google-profile-heading"
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-quiet"
        >
          <GoogleIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="google-profile-heading" className="text-h4">
            {heading}
          </h2>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild variant="accent">
          <a href={reviewUrl} target="_blank" rel="noopener noreferrer">
            <Star aria-hidden="true" />
            Leave a Google review
            <span className="sr-only"> (opens Google)</span>
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            View Google profile
            <ExternalLink aria-hidden="true" />
            <span className="sr-only"> (opens Google)</span>
          </a>
        </Button>
      </div>
    </section>
  );
}
