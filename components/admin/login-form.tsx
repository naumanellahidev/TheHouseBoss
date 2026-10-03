"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, Input } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

/**
 * Admin sign-in — docs/06 § 1.
 *
 * ── Why there is a password now ───────────────────────────────────────────
 *
 * There was only a magic link, and in a browser that is the better mechanism:
 * nothing to remember, nothing to leak, and the email is the second factor.
 *
 * It breaks in the one place the client actually works from. The dashboard is
 * installed to her home screen, and a link tapped in Mail opens in **Safari**,
 * not in the installed app — iOS gives a standalone web app its own window and
 * nothing outside it can navigate into that window. So the session landed in a
 * browser tab and the app she had just opened was still showing this form. Every
 * time.
 *
 * A password completes the sign-in inside whichever window asked for it. The
 * magic link stays, because it is the recovery path when the password is
 * forgotten and the only way in before one has been set.
 *
 * ── What is unchanged ─────────────────────────────────────────────────────
 *
 * No signup route and no account enumeration. A wrong password and an unknown
 * address produce the same sentence, and requesting a link produces the same
 * "check your email" whether or not the address has an account — there is
 * exactly one admin, and confirming which addresses exist is the whole attack.
 *
 * Rate limiting is Supabase's own, per address and per project.
 */
export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const router = useRouter();

  const [mode, setMode] = React.useState<"password" | "link">("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [state, setState] = React.useState<"idle" | "working" | "sent" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  const destination = next && next.startsWith("/admin") ? next : "/admin";

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("working");
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setState("error");
      setMessage(
        /rate|limit|seconds/i.test(error.message)
          ? "Too many attempts. Wait a few minutes and try again."
          : // One sentence for a wrong password, an unknown address and an
            // account with no password set. Each of the three alternatives
            // tells a stranger something about the account.
            "That email and password did not match. If you have never set a password, use the emailed link instead.",
      );
      return;
    }

    /*
      A full navigation, not `router.push`.

      The session was just written to cookies by the browser client. The server
      components that decide whether this person may see the dashboard read
      those cookies on the REQUEST, and a client-side transition reuses the RSC
      payload fetched before they existed. `refresh()` then `replace()` is the
      pair that makes the next render see the new session.
    */
    router.refresh();
    router.replace(destination);
  }

  async function sendLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("working");
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
        {/*
          Said plainly, because it is the thing that confuses people.

          Tapping the link opens Safari. If she is in the installed app, the app
          will still be on this screen afterwards — the session is in the
          browser, not in the app window.
        */}
        <p className="rounded-md bg-surface-sunken p-3 text-sm text-foreground-muted">
          The link opens in Safari. If you are using the installed app, sign in
          with your password here instead — set one in{" "}
          <span className="font-medium text-foreground">Settings → Account</span>{" "}
          once you are in.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setState("idle");
            setMessage(null);
          }}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={mode === "password" ? signInWithPassword : sendLink}
      className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm"
    >
      {linkError ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-foreground"
        >
          That sign-in link has expired or has already been used. Sign in with
          your password, or request a new link.
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
      </Field>

      {mode === "password" ? (
        <Field>
          <FieldLabel required>Password</FieldLabel>
          <Input
            name="password"
            type="password"
            /*
              `current-password`, so the phone's password manager offers the
              saved one and Face ID fills it. Without it iOS treats the field as
              a new password and offers to generate one instead, which on a
              sign-in form is the wrong half of the keychain.
            */
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldDescription>
            Stays signed in on this device until you sign out.
          </FieldDescription>
        </Field>
      ) : (
        <FieldDescription>
          We will email a link that signs you in once. It opens in Safari, not in
          the installed app.
        </FieldDescription>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        loading={state === "working"}
        loadingLabel={mode === "password" ? "Signing in" : "Sending your sign-in link"}
        disabled={
          email.trim().length < 3 || (mode === "password" && password.length < 1)
        }
      >
        {mode === "password" ? "Sign in" : "Send magic link"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setState("idle");
          setMessage(null);
        }}
        className={cn(
          "mx-auto inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold",
          "text-accent-quiet hover:bg-accent-wash",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        )}
      >
        {mode === "password" ? "Email me a link instead" : "Use my password instead"}
      </button>
    </form>
  );
}
