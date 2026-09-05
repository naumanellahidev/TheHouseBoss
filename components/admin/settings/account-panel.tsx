"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";

import {
  changeEmail,
  changePassword,
  changeUsername,
  signOutEverywhere,
  type AccountResult,
} from "@/app/(admin)/admin/(shell)/settings/account-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

/**
 * Account & Security (brief §47–§51, §106).
 *
 * ── Why three separate forms and not one ──────────────────────────────────
 *
 * Each one has a different consequence and a different confirmation. Changing
 * a username is reversible in a second; changing a password signs every device
 * out; changing an email does nothing at all until a link in an inbox is
 * followed. One "Save account settings" button spanning the three would make
 * all of that invisible at the moment of pressing it.
 *
 * ── Why the password field warns before it is used ────────────────────────
 *
 * §49 requires that changing a password ends every other session, and this one
 * too. That is correct behaviour and a surprise if it is discovered afterwards
 * — particularly for someone doing it on a phone with the laptop closed. The
 * consequence is stated above the field, not in a toast after the fact.
 */
export function AccountPanel({
  username,
  email,
  role,
}: {
  username: string;
  email: string;
  role: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);

  const [nextUsername, setNextUsername] = React.useState(username);
  const [usernamePassword, setUsernamePassword] = React.useState("");
  const [nextEmail, setNextEmail] = React.useState(email);
  const [emailPassword, setEmailPassword] = React.useState("");
  const [pw, setPw] = React.useState({ current: "", next: "", confirm: "" });
  const [fieldError, setFieldError] = React.useState<Record<string, string>>({});

  async function run(key: string, work: () => Promise<AccountResult>) {
    setBusy(key);
    setFieldError({});
    const result = await work();
    setBusy(null);

    if (!result.ok) {
      if (result.field) setFieldError({ [result.field]: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(result.message);

    /*
      The server has already revoked this session at this point, so the next
      request would bounce to the login page anyway. Pushing there explicitly
      means the user sees why rather than watching a page fail to load.
    */
    if (result.signedOut) {
      router.push("/admin/login?reason=password-changed");
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {/* ── Who you are ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-border bg-surface p-4">
        <span className="flex items-center gap-2 text-sm">
          <UserRound className="size-4 text-foreground-subtle" aria-hidden="true" />
          <span className="text-foreground-muted">Signed in as</span>
          <span className="font-semibold text-foreground">{username}</span>
        </span>
        <span className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-foreground-subtle" aria-hidden="true" />
          <span className="text-foreground-muted">Role</span>
          <span className="font-semibold text-foreground">{role}</span>
        </span>
      </div>

      {/* ── Username ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-h4 font-semibold">Username</h3>
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            What you type on the sign-in screen. Changing it does not change your
            password and does not sign you out.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldError.username}>
            <FieldLabel>New username</FieldLabel>
            <Input
              value={nextUsername}
              autoComplete="username"
              onChange={(event) => setNextUsername(event.target.value)}
            />
            <FieldDescription>
              Letters, numbers, dots, hyphens and underscores.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Your password</FieldLabel>
            <Input
              type="password"
              value={usernamePassword}
              autoComplete="current-password"
              onChange={(event) => setUsernamePassword(event.target.value)}
            />
            <FieldDescription>Confirms it is really you.</FieldDescription>
          </Field>
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
            loading={busy === "username"}
            disabled={!usernamePassword || nextUsername === username}
            onClick={() =>
              run("username", () =>
                changeUsername({ username: nextUsername, password: usernamePassword }),
              )
            }
          >
            <UserRound aria-hidden="true" />
            Change username
          </Button>
        </div>
      </section>

      {/* ── Email ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div className="flex flex-col gap-1">
          <h3 className="text-h4 font-semibold">Email address</h3>
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            Used for password resets. A confirmation link is sent to the new
            address and nothing changes until you follow it — so a typo cannot
            lock you out.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldError.email}>
            <FieldLabel>New email address</FieldLabel>
            <Input
              type="email"
              value={nextEmail}
              autoComplete="email"
              onChange={(event) => setNextEmail(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Your password</FieldLabel>
            <Input
              type="password"
              value={emailPassword}
              autoComplete="current-password"
              onChange={(event) => setEmailPassword(event.target.value)}
            />
          </Field>
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
            loading={busy === "email"}
            disabled={!emailPassword || nextEmail === email}
            onClick={() =>
              run("email", () => changeEmail({ email: nextEmail, password: emailPassword }))
            }
          >
            <Mail aria-hidden="true" />
            Send confirmation
          </Button>
        </div>
      </section>

      {/* ── Password ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div className="flex flex-col gap-1">
          <h3 className="text-h4 font-semibold">Password</h3>
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            Use a phrase you can remember rather than a jumble you cannot — length
            protects an account far better than punctuation does.
          </p>
        </div>

        {/*
          Stated before the fields, not after the deed. Someone changing their
          password on a phone needs to know the laptop at home is about to be
          signed out while they still have the option not to.
        */}
        <p className="flex max-w-[70ch] items-start gap-2.5 rounded-md border border-warning/30 bg-warning-bg p-4 text-sm text-foreground">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            Changing your password signs out <strong>every</strong> device,
            including this one. That is deliberate: if someone else has your old
            password, this is what removes them. You will sign in again straight
            away with the new one.
          </span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldError.current} className="sm:col-span-2">
            <FieldLabel>Current password</FieldLabel>
            <Input
              type="password"
              value={pw.current}
              autoComplete="current-password"
              onChange={(event) => setPw({ ...pw, current: event.target.value })}
            />
          </Field>

          <Field error={fieldError.next}>
            <FieldLabel>New password</FieldLabel>
            <Input
              type="password"
              value={pw.next}
              autoComplete="new-password"
              onChange={(event) => setPw({ ...pw, next: event.target.value })}
            />
            <FieldDescription>
              <span className="tabular">{pw.next.length}</span> characters — at
              least 12.
            </FieldDescription>
          </Field>

          <Field error={fieldError.confirm}>
            <FieldLabel>Repeat new password</FieldLabel>
            <Input
              type="password"
              value={pw.confirm}
              autoComplete="new-password"
              onChange={(event) => setPw({ ...pw, confirm: event.target.value })}
            />
          </Field>
        </div>

        <div>
          <Button
            type="button"
            variant="accent"
            loading={busy === "password"}
            disabled={!pw.current || pw.next.length < 12 || !pw.confirm}
            onClick={() => run("password", () => changePassword(pw))}
          >
            <KeyRound aria-hidden="true" />
            Change password and sign out everywhere
          </Button>
        </div>
      </section>

      {/* ── Sessions ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div className="flex flex-col gap-1">
          <h3 className="text-h4 font-semibold">Sessions</h3>
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            Left yourself signed in on a shared or lost device? This ends every
            session without changing your password.
          </p>
        </div>

        {/*
          No list of devices. Supabase does not expose per-session metadata
          through a supported API, and §50 asks for one only "if technically
          supported" — inventing a table of plausible-looking devices would be
          exactly the fake data §79 forbids, and on a security screen a fake
          device list is worse than none: it invites someone to conclude their
          account is safe from a display that knows nothing.
        */}
        <div>
          <Button
            type="button"
            variant="outline"
            loading={busy === "sessions"}
            onClick={() => setConfirmSignOut(true)}
          >
            <LogOut aria-hidden="true" />
            Sign out on every device
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out on every device?"
        description="Every signed-in device, including this one, will be returned to the sign-in screen. Your password does not change."
        confirmLabel="Sign out everywhere"
        onConfirm={async () => {
          setConfirmSignOut(false);
          await run("sessions", signOutEverywhere);
        }}
      />
    </div>
  );
}
