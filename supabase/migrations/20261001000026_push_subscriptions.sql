-- ─────────────────────────────────────────────────────────────────────────────
-- Web push subscriptions (docs/06 § 2a)
--
-- One row per device that has agreed to receive notifications. A browser hands
-- back an endpoint URL and two keys; those three values ARE the subscription,
-- and sending to the endpoint is what makes a phone buzz with the app closed.
--
-- ── Why a table and not a column on profiles ────────────────────────────────
--
-- One person has several devices — a phone, an iPad, a laptop — and each gets
-- its own subscription from its own browser. A column would hold the last one
-- to ask and silently stop notifying the rest.
--
-- ── Why the endpoint is the key ─────────────────────────────────────────────
--
-- The push service mints it, it is unique per device per origin, and the same
-- browser re-subscribing returns the same endpoint. Making it unique turns a
-- re-subscribe into an upsert instead of a slow leak of dead rows.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--
--   drop table if exists public.push_subscriptions;
--
-- Nothing references it, so dropping it costs the notifications and nothing
-- else — the emails Resend sends are a separate path and are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),

  -- Whose device. Cascades, so removing an admin removes their subscriptions
  -- rather than leaving rows that would be pushed to forever.
  user_id uuid not null references auth.users (id) on delete cascade,

  -- The push service URL. Long: FCM and Apple both mint opaque tokens.
  endpoint text not null,

  -- The two halves of the ECDH keypair the browser gives us. Without both, a
  -- payload cannot be encrypted and the push is rejected.
  p256dh text not null,
  auth text not null,

  -- Which browser agreed, so a stale row can be identified in the UI rather
  -- than shown as an anonymous endpoint.
  user_agent text,

  created_at timestamptz not null default now(),

  -- Updated when a send succeeds, so a device that has been silent for months
  -- is visible. Never used to decide whether to send: a quiet phone is still a
  -- phone somebody is carrying.
  last_used_at timestamptz,

  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- No anon access of any kind. A subscription endpoint is a capability: anyone
-- holding it can push a notification to that device. The public role cannot
-- read, insert, update or delete, and the only writes come from server code
-- running as the signed-in admin or as the service role.

alter table public.push_subscriptions enable row level security;

-- An admin sees and manages their own devices. `is_admin()` as well as the
-- ownership check, because this is admin-only machinery and a future
-- non-admin authenticated role must not acquire a way in.
create policy "own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (is_admin() and user_id = auth.uid())
  with check (is_admin() and user_id = auth.uid());

comment on table public.push_subscriptions is
  'Devices that receive admin push notifications. The endpoint is a capability — never expose a row to anon.';
