"use client";

import * as React from "react";
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/field";

/**
 * Username + password sign-in.
 *
 * A plain `<form method="post" action="/api/admin/login">`. No Server Action,
 * no fetch, no client state holding the credential.
 *
 * That is deliberate and measured. The Server Action version authenticated
 * correctly every time — the audit log said `outcome: success` — but neither
 * its return value nor the auth cookies reached the browser. A route handler
 * returns a real 303 with real Set-Cookie headers, which is the oldest and most
 * reliable way to start a session.
 *
 * The consequences are all good ones: it submits before hydration and with
 * JavaScript disabled, the error survives a refresh because it lives in the
 * URL, and the password never enters React state, so it cannot appear in a
 * DevTools snapshot or a client-side error report.
 *
 * The only client-side behaviour here is the show/hide toggle.
 */
export function UsernameLoginForm({
  next,
  error,
}: {
  next?: string;
  /** From `?error=` — `credentials` or `throttled`. */
  error?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const message =
    error === "throttled"
      ? "Too many attempts. Please wait a few minutes and try again."
      : error
        ? "That username and password do not match."
        : null;

  return (
    <form
      method="post"
      action="/api/admin/login"
      onSubmit={() => setSubmitting(true)}
      className="flex flex-col gap-5"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field id="login-username">
        <FieldLabel required>Username</FieldLabel>
        <Input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
        />
      </Field>

      <Field id="login-password">
        <FieldLabel required>Password</FieldLabel>
        <div className="relative">
          <Input
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            // A real label, not just a glyph: the action is announced and the
            // state is exposed rather than implied by the icon.
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {visible ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Field>

      {message ? (
        <p
          // assertive: the person just submitted and is waiting on this.
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-md bg-danger-bg p-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </p>
      ) : null}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        block
        loading={submitting}
        loadingLabel="Signing in"
      >
        <LogIn className="size-5" aria-hidden="true" />
        Sign in
      </Button>

      <p className="text-sm text-foreground-subtle">
        Forgotten your password? It can be reset from Admin &rarr; Users, or ask
        your developer to send a recovery link.
      </p>
    </form>
  );
}
