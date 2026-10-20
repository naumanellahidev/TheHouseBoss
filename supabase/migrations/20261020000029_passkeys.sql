-- ─────────────────────────────────────────────────────────────────────────────
-- Passkeys — sign in and unlock the installed app with a fingerprint / face
-- (WebAuthn), on top of Supabase Auth.
--
-- ── Two tables, two jobs ────────────────────────────────────────────────────
--
-- `admin_passkeys` is the durable list of credentials a device registered: one
-- row per fingerprint added, holding the public key and a signature counter.
-- Signing in verifies a fresh assertion against the stored public key.
--
-- `auth_challenges` is scratch space. WebAuthn signs a server-issued random
-- challenge so a captured assertion cannot be replayed; the challenge lives for
-- five minutes, is referenced from an httpOnly cookie, and is deleted the moment
-- it is used. Rows older than their expiry are swept opportunistically by the
-- verify route, so no cron is owed.
--
-- ── Why the public key is all that is stored ────────────────────────────────
--
-- A passkey's private key never leaves the phone's secure hardware; the server
-- only ever holds the public half and a counter. There is nothing here that can
-- impersonate the user if the row leaks — unlike a push endpoint, which is a
-- capability. The counter is checked to be non-decreasing, which is how a cloned
-- authenticator is detected.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--
--   drop table if exists public.auth_challenges;
--   drop table if exists public.admin_passkeys;
--
-- Dropping them costs fingerprint sign-in and the app lock and nothing else:
-- username + password still signs in, and the session machinery is untouched.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_passkeys (
  -- The credential ID the authenticator minted (base64url). Unique per key.
  id text primary key,

  -- Whose fingerprint. Cascades, so removing an admin removes their passkeys.
  user_id uuid not null references auth.users (id) on delete cascade,

  -- The COSE public key (base64url). The private half stays in the phone.
  public_key text not null,

  -- Signature counter. Must never go backwards for a given key; a decrease
  -- means a cloned authenticator and the assertion is rejected.
  counter bigint not null default 0,

  -- How the authenticator can be reached ("internal" for a built-in
  -- fingerprint). Lets the browser go straight to this device's sensor.
  transports text[] not null default '{}',

  -- A human label for the device, so a stale key is identifiable in the UI
  -- rather than shown as an opaque credential ID.
  device text,

  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists admin_passkeys_user_idx
  on public.admin_passkeys (user_id);

create table if not exists public.auth_challenges (
  id uuid primary key default gen_random_uuid(),

  -- The random value the authenticator must sign (base64url).
  challenge text not null,

  -- For registration (which happens signed in) this pins the challenge to the
  -- user. For sign-in the user is not known yet, so it is null.
  user_id uuid references auth.users (id) on delete cascade,

  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists auth_challenges_expiry_idx
  on public.auth_challenges (expires_at);

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- No anon access, and no client access at all. Every read and write happens in
-- server code: registration runs as the signed-in admin, sign-in verification
-- runs as the service role (the user is not authenticated yet at that point).
-- With RLS enabled and no permissive policy for anon or a bare authenticated
-- role, the anon and public-authenticated paths can touch neither table, while
-- the service role bypasses RLS by design.

alter table public.admin_passkeys enable row level security;
alter table public.auth_challenges enable row level security;

-- An admin may see and remove their own passkeys (the Settings list). Writes
-- that create a passkey or bump a counter go through the service role, so this
-- policy is deliberately only ownership + is_admin(), not a general insert path.
create policy "own passkeys"
  on public.admin_passkeys for all
  to authenticated
  using (is_admin() and user_id = auth.uid())
  with check (is_admin() and user_id = auth.uid());

-- No policy on auth_challenges: it is service-role-only scratch space. Enabling
-- RLS with zero policies denies every non-service role, which is the intent.

comment on table public.admin_passkeys is
  'WebAuthn credentials for fingerprint sign-in and app unlock. Stores only the public key; the private key never leaves the device.';
comment on table public.auth_challenges is
  'One-time, five-minute WebAuthn challenges. Service-role scratch space; no client access.';
