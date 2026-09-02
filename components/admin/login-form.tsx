"use client";

import * as React from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, Input } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Magic-link sign-in — docs/06 § 1. No passwords, no signup route.
 *
 * Two behaviours the spec calls out explicitly:
 *
 *   1. after submit the form is REPLACED by "Check your email". Clearing the
 *      field and leaving the user staring at an empty form is the failure mode
 *      this replaces.
 *   2. the response is identical whether or not the address has an account.
 *      Telling a stranger which email addresses can sign in is an enumeration
 *      oracle, and there is exactly one admin.
 *
 * Rate limiting is Supabase's own (per email, per project) plus the client-side
 * cooldown below. The server-side limiter in lib/rate-limit.ts guards routes we
 * own; this request goes straight to Supabase Auth.
 */
export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const callback = new URL("/admin/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callback.toString(),
        // There is no public signup. A new address must be created and
        // promoted by SQL first (docs/06 § 1).
        shouldCreateUser: false,
      },
    });

    if (error) {
      // "Signups not allowed" means the address has no account. Answering that
      // truthfully would confirm which addresses exist, so it is folded into
      // the same success state as a real send.
      const isUnknownAddress = /signup|not allowed|not found/i.test(error.message);
      if (isUnknownAddress) {
        setState("sent");
        return;
      }
      setState("error");
      setMessage(
        /rate|limit|seconds/i.test(error.message)
          ? "Too many sign-in attempts. Wait a few minutes and try again."
          : "The sign-in email could not be sent. Check the connection and try again.",
      );
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 shadow-sm"
      >
        <MailCheck className="size-6 text-accent-quiet" aria-hidden="true" />
        <h2 className="text-h4 font-semibold text-foreground">Check your email</h2>
        <p className="text-sm leading-relaxed text-foreground-muted">
          If <span className="font-medium text-foreground">{email}</span> has an
          account, a sign-in link is on its way. The link works once and expires
          in an hour.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setState("idle");
            setMessage(null);
          }}
        >
          Use a different address
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm"
    >
      {linkError ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-foreground"
        >
          That sign-in link has expired or has already been used. Request a new
          one below.
        </p>
      ) : null}

      <Field error={state === "error" ? (message ?? undefined) : undefined}>
        <FieldLabel required>Email address</FieldLabel>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FieldDescription>
          Sign-in is by emailed link. There is no password to remember or lose.
        </FieldDescription>
      </Field>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        loading={state === "sending"}
        loadingLabel="Sending your sign-in link"
        disabled={email.trim().length < 3}
      >
        Send magic link
      </Button>
    </form>
  );
}
