-- ─────────────────────────────────────────────────────────────────────────────
-- Take the table away from anon entirely (migration 026 follow-up)
--
-- ── What this fixes, and what it does not ───────────────────────────────────
--
-- Nothing was leaking. RLS was doing its job: `scripts/test-rls.ts` showed anon
-- receiving zero rows. But it received them as an EMPTY RESULT rather than a
-- refusal, because row-level security filters rows — it does not withdraw the
-- privilege to ask.
--
-- The difference matters here more than it does on most tables. A subscription
-- endpoint is a capability: anyone holding one can push a notification to that
-- device, signed by our VAPID key. The protection should not rest on a single
-- policy being correct forever — one future migration adding a permissive
-- `using (true)` for a case nobody thought through, and the rows are public.
--
-- Revoking the grant means that even then the request is refused. Two
-- independent things would have to be wrong instead of one.
--
-- ── Who still has access ────────────────────────────────────────────────────
--
-- `authenticated` keeps its grant and is bounded by the policy from 026 —
-- `is_admin() and user_id = auth.uid()`. The service role is unaffected by both
-- grants and policies, which is how `lib/push/send.ts` reads every device when
-- an enquiry arrives.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--
--   grant select, insert, update, delete on public.push_subscriptions to anon;
--
-- Which should never be needed. No public page reads or writes this table.
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.push_subscriptions from anon;

comment on table public.push_subscriptions is
  'Devices that receive admin push notifications. The endpoint is a capability — anon holds no grant on this table and no policy for it.';
