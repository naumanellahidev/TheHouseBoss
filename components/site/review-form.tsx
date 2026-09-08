"use client";

import * as React from "react";
import { CheckCircle2, MessageSquarePlus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Honeypot,
  Input,
  Textarea,
} from "@/components/ui/field";
import { PUBLIC_REVIEW_MIN } from "@/lib/validation/review";
import { cn } from "@/lib/utils";

/**
 * "Write a review" — the visitor's half of the reviews system.
 *
 * ── Why a dialog and not a page ───────────────────────────────────────────
 *
 * The person clicking this has already decided to write something. A route
 * change costs them the context they were reading and hands them a back button
 * to lose their draft with. Five fields fit in a modal; the trade would be
 * worth making for a long form and is not worth it for this one.
 *
 * ── What it can and cannot do ─────────────────────────────────────────────
 *
 * It cannot publish. `/api/reviews` writes `published: false`, and the policy
 * added in migration 024 grants anon INSERT only `with check (published =
 * false)` — so this component could not put a review on the site even if it
 * were rewritten to try. Everything waits in Admin → Reviews.
 *
 * That is worth saying in the UI rather than only here: a person who writes
 * three paragraphs and then sees nothing appear assumes it failed. The
 * confirmation says it is waiting to be read.
 *
 * ── The rating ────────────────────────────────────────────────────────────
 *
 * Radio inputs, not buttons. A star rating built from buttons has to
 * reimplement arrow-key movement, the roving tabindex and the group's
 * accessible name; a radio group has all of that already, and the stars are
 * drawn over the real inputs. Required, because a review with no rating is a
 * testimonial — still worth having, but the client asked for reviews.
 */

const RATINGS = [1, 2, 3, 4, 5] as const;

export function ReviewForm({
  label = "Write a review",
  variant = "invert",
  size = "lg",
  className,
}: {
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState<number | null>(null);

  /*
    Reset when the dialog closes, but only once it has finished closing.
    Wiping the fields while the exit is still painting shows an empty form for
    a frame, which reads as "it lost what I typed".
  */
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      window.setTimeout(() => {
        setState("idle");
        setError(null);
        setRating(null);
      }, 200);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const form = new FormData(event.currentTarget);
    const chosen = form.get("rating");

    const payload = {
      authorName: String(form.get("authorName") ?? ""),
      authorEmail: String(form.get("authorEmail") ?? ""),
      authorRole: String(form.get("authorRole") ?? ""),
      // The schema wants a number; a form always hands back a string.
      rating: chosen === null ? undefined : Number(chosen),
      body: String(form.get("body") ?? ""),
      website: String(form.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || result.error) {
        setError(result.error ?? "That review could not be sent. Try again.");
        setState("error");
        return;
      }

      setState("sent");
    } catch {
      setError(
        "That review could not be sent — check your connection and try again.",
      );
      setState("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <MessageSquarePlus aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Write a review"
        description="It goes to Krisi to read before it appears on the site."
        className="max-w-lg"
      >
        {state === "sent" ? (
          <div role="status" className="flex flex-col items-start gap-3 px-5 py-6">
            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
            <h3 className="text-h4 font-semibold text-foreground">
              Thank you — that is with Krisi.
            </h3>
            <p className="text-sm text-foreground-muted">
              Reviews are read before they go up, so it will not appear on the
              site straight away. Nothing you wrote will be changed.
            </p>
            <DialogFooter className="w-full">
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="relative flex flex-col gap-5 overflow-y-auto px-5 py-5"
          >
            <Honeypot name="website" />

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">
                Your rating
              </legend>
              <div className="flex items-center gap-1">
                {RATINGS.map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "relative inline-flex size-11 cursor-pointer items-center justify-center rounded-md",
                      "transition-colors duration-(--dur-fast) hover:bg-accent-wash",
                      "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
                    )}
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      required
                      checked={rating === value}
                      onChange={() => setRating(value)}
                      className="sr-only"
                    />
                    <Star
                      aria-hidden="true"
                      className={cn(
                        "size-6",
                        rating !== null && value <= rating
                          ? "fill-current text-accent"
                          : "text-foreground-subtle",
                      )}
                    />
                    <span className="sr-only">
                      {value} {value === 1 ? "star" : "stars"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field>
              <FieldLabel required>Your name</FieldLabel>
              <Input name="authorName" required maxLength={120} autoComplete="name" />
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                name="authorEmail"
                type="email"
                maxLength={200}
                autoComplete="email"
              />
              <FieldDescription>
                Never published. It is only so Krisi can confirm the review is
                yours.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>How should we describe you?</FieldLabel>
              <Input name="authorRole" maxLength={120} placeholder="Buyer, Lake Mary" />
              <FieldDescription>
                Shown under your name. Leave it blank to show just the name.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel required>Your review</FieldLabel>
              <Textarea
                name="body"
                required
                rows={6}
                minLength={PUBLIC_REVIEW_MIN}
                maxLength={5000}
                placeholder="What were you buying or selling, and what was working with Krisi like?"
              />
              <FieldDescription>
                At least {PUBLIC_REVIEW_MIN} characters.
              </FieldDescription>
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-foreground"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter className="mt-0">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={state === "sending"}>
                Send review
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
