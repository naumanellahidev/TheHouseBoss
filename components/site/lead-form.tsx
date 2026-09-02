"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Honeypot,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { LeadType } from "@/types/domain";

/**
 * The public lead form.
 *
 * Phase 0 shipped the layout, states and accessibility; Phase 2 wired the
 * submit to POST /api/leads, which re-validates with the SAME zod schema, rate
 * limits per IP and sends both emails.
 *
 * Rules enforced here (docs/03 § 6, docs/09 § 5):
 *  - labels always visible; never placeholder-as-label
 *  - required marked with the word "Required"
 *  - honeypot present, hidden from users AND assistive tech
 *  - success replaces the form inline; no navigation away
 *  - consent line with a link to the privacy policy
 */

const interestOptions: { value: LeadType; label: string }[] = [
  { value: "general", label: "General enquiry" },
  { value: "listing_inquiry", label: "Buying a home" },
  { value: "seller", label: "Selling a home" },
  { value: "new_construction", label: "New construction" },
  { value: "va", label: "VA home loan purchase" },
  { value: "assumable", label: "Assumable mortgage" },
];

export function LeadForm({
  leadType = "general",
  heading,
  description,
  compact = false,
  showInterest = true,
  submitLabel = "Send message",
  listingId,
  className,
}: {
  leadType?: LeadType;
  heading?: string;
  description?: string;
  compact?: boolean;
  showInterest?: boolean;
  submitLabel?: string;
  /** Set on a listing page so the enquiry is linked to the property. */
  listingId?: string;
  className?: string;
}) {
  const [state, setState] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);

    const form = new FormData(e.currentTarget);
    const interest = String(form.get("interest") ?? "");

    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      message: String(form.get("message") ?? ""),
      // The "I'm interested in" select overrides the page's default type, so a
      // visitor who lands on the VA guide but asks about selling is filed as a
      // seller.
      leadType: interest || leadType,
      sourcePage:
        typeof window === "undefined"
          ? undefined
          : window.location.pathname + window.location.search,
      ...(listingId ? { listingId } : {}),
      // Honeypot: hidden from users AND assistive tech. A real person leaves it
      // empty, and the route treats anything in it as a bot.
      company: String(form.get("company") ?? ""),
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || result.error) {
        setError(result.error ?? "That message could not be sent. Try again.");
        setState("error");
        return;
      }

      setState("sent");
    } catch {
      setError(
        "That message could not be sent — check your connection and try again.",
      );
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-start gap-3 rounded-lg border border-success/30 bg-success-bg p-6",
          className,
        )}
      >
        <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
        <h3 className="text-h4 font-semibold text-foreground">
          Thanks — your message is on its way.
        </h3>
        <p className="text-sm text-foreground-muted">
          Krisi replies personally, usually the same business day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6",
        className,
      )}
    >
      {heading ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-h3">{heading}</h3>
          {description ? (
            <p className="text-sm text-foreground-muted">{description}</p>
          ) : null}
        </div>
      ) : null}

      <Honeypot />
      <input type="hidden" name="lead_type" value={leadType} />

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Field>
          <FieldLabel required>Name</FieldLabel>
          <Input name="name" autoComplete="name" required />
        </Field>

        <Field>
          <FieldLabel required>Email</FieldLabel>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>

        <Field>
          <FieldLabel>Phone</FieldLabel>
          <Input name="phone" type="tel" autoComplete="tel" inputMode="tel" />
        </Field>

        {showInterest ? (
          <Field>
            <FieldLabel>I&rsquo;m interested in</FieldLabel>
            <Select name="interest" defaultValue={leadType}>
              {interestOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <Field>
        <FieldLabel>Message</FieldLabel>
        <Textarea
          name="message"
          rows={4}
          placeholder="Tell Krisi what you're looking for."
        />
        <FieldDescription>
          The more detail you give, the more useful her first reply will be.
        </FieldDescription>
      </Field>

      <div className="flex flex-col gap-3">
        {state === "error" && error ? (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-foreground"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          block
          loading={state === "sending"}
          loadingLabel="Sending your message"
        >
          {submitLabel}
        </Button>

        <p className="text-xs leading-relaxed text-foreground-subtle">
          By submitting this form you agree to be contacted about your enquiry.
          You can opt out at any time. See our{" "}
          <Link
            href="/legal/privacy"
            className="text-accent-quiet underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
