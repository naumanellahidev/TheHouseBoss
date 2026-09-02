"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";

import { FacebookIcon, LinkedinIcon } from "@/components/site/social-icons";

import { cn } from "@/lib/utils";

/**
 * Share links for an article.
 *
 * Real links, not a tracking script. Two networks and a copy button covers what
 * anyone actually uses, and none of it loads third-party JavaScript — a share
 * widget that ships a tracker onto every article page is a poor trade for a
 * site whose whole argument is that its content is worth citing.
 *
 * The brand marks come from components/site/social-icons.tsx rather than from
 * lucide, which dropped its brand icons — the same hand-drawn set the footer
 * already uses, so there is one definition of each.
 *
 * The copy button uses the async clipboard API, which needs a secure context.
 * It falls back to selecting nothing and saying so rather than failing silently.
 */
export function ShareRow({ title }: { title: string }) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setFailed(true);
    }
  }

  const linkClass = cn(
    "inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium",
    "text-foreground-muted transition-colors duration-(--dur-fast)",
    "hover:bg-surface-sunken hover:text-foreground",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-foreground-subtle">Share</span>

      <ShareLink
        className={linkClass}
        href={(url) =>
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        }
        label="Share on Facebook"
      >
        <FacebookIcon className="size-4" />
        Facebook
      </ShareLink>

      <ShareLink
        className={linkClass}
        href={(url) =>
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        }
        label="Share on LinkedIn"
      >
        <LinkedinIcon className="size-4" />
        LinkedIn
      </ShareLink>

      <button type="button" onClick={copy} className={linkClass}>
        {copied ? (
          <Check className="size-4 text-success" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        {copied ? "Link copied" : failed ? "Press Ctrl+C" : "Copy link"}
      </button>

      <span className="sr-only" role="status">
        {copied ? `Link to ${title} copied` : ""}
      </span>
    </div>
  );
}

/**
 * The share URL is only known in the browser, so the href is built on click
 * rather than during render — which also keeps the server output identical for
 * every visitor and avoids a hydration mismatch.
 */
function ShareLink({
  href,
  label,
  className,
  children,
}: {
  href: (url: string) => string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href="#"
      aria-label={label}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        window.open(href(window.location.href), "_blank", "noopener,noreferrer,width=600,height=520");
      }}
    >
      {children}
    </a>
  );
}
