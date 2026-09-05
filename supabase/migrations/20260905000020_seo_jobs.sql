-- 020_seo_jobs.sql
--
-- The SEO job queue (brief §36, §94).
--
-- WHY A QUEUE AND NOT A LONGER LOOP
--
-- §36 asks for queued / processing / completed / failed, and says plainly: do
-- not pretend a background worker exists if one has not been implemented.
--
-- So this is a real queue with a real worker, and the worker is the cron route
-- that already runs on this deployment. A server action enqueues; the cron
-- drains a batch each run; the admin polls the counts. Nothing about it
-- pretends to be instantaneous, because it is not.
--
-- The alternative — one server action looping over 400 records — is what the
-- code did before, and it has a hard ceiling: a Vercel function that exceeds
-- its execution limit is killed with half the work done and no record of which
-- half. A queue survives that: the killed batch's rows are still `queued` and
-- the next run picks them up.
--
-- WHY THE CLAIM IS A TIMESTAMP AND NOT A BOOLEAN
--
-- `started_at` doubles as the lock. Two concurrent workers cannot both take a
-- job because the claim is an UPDATE ... WHERE started_at IS NULL, which is
-- atomic; and a worker that dies mid-job leaves a `started_at` old enough for
-- the requeue below to reclaim it. A boolean `locked` column would need a
-- separate heartbeat to distinguish "running" from "died holding the lock".
--
-- ROLLBACK
--   drop table seo_jobs; drop type seo_job_kind;

create type seo_job_kind as enum (
  'listing',
  'article',
  'city',
  'community'
);

create table seo_jobs (
  id           uuid primary key default gen_random_uuid(),

  kind         seo_job_kind not null,
  -- The record to process. No FK: a job for a record deleted while queued
  -- should fail cleanly and be visible in the queue, not vanish silently with
  -- the cascade.
  entity_id    uuid not null,
  -- Carried so the admin can show "123 Lakeview Dr" rather than a uuid without
  -- joining four tables per row.
  label        text not null,

  status       seo_run_status not null default 'queued',
  trigger      seo_run_trigger not null default 'bulk',

  attempts     smallint not null default 0,
  -- Three, then it stops. A job that has failed three times is failing for a
  -- reason retrying will not fix, and an infinite retry loop against a rate
  -- limited provider is worse than a stopped queue.
  max_attempts smallint not null default 3,

  error        text,
  run_id       uuid references seo_generation_runs(id) on delete set null,

  queued_at    timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,

  -- One outstanding job per record. Re-queuing something already waiting is a
  -- no-op rather than a second identical unit of work.
  constraint seo_jobs_attempts_sane check (attempts <= max_attempts + 1)
);

create unique index seo_jobs_pending_uniq
  on seo_jobs (kind, entity_id)
  where status in ('queued', 'processing');

-- The worker's only query: oldest queued job first.
create index seo_jobs_claim_idx on seo_jobs (queued_at)
  where status = 'queued';

create index seo_jobs_status_idx on seo_jobs (status, queued_at desc);

comment on table seo_jobs is
  'Brief §36. Queued work for the SEO engine, drained by the cron route. '
  'started_at doubles as the claim lock.';

-- ---------------------------------------------------------------------------
-- Reclaim jobs whose worker died.
--
-- A function rather than application code because it has to be atomic against
-- concurrent workers, and because "what counts as stuck" is a property of the
-- queue rather than of whichever process happens to ask.
-- ---------------------------------------------------------------------------

create or replace function requeue_stuck_seo_jobs(older_than interval default '10 minutes')
returns integer
language sql
security definer
set search_path = public
as $$
  with reclaimed as (
    update seo_jobs
       set status = 'queued',
           started_at = null,
           error = 'Reclaimed: the worker did not finish.'
     where status = 'processing'
       and started_at < now() - older_than
       and attempts < max_attempts
    returning id
  )
  select count(*)::int from reclaimed;
$$;

comment on function requeue_stuck_seo_jobs is
  'Returns unfinished jobs to the queue. Ten minutes is far longer than a job '
  'takes (about a second) and far shorter than a person would wait before '
  'assuming the queue is broken.';

alter table seo_jobs enable row level security;

create policy "admin all seo_jobs" on seo_jobs
  for all to authenticated using (is_admin()) with check (is_admin());
