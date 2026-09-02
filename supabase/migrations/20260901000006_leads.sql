-- 006_leads.sql
-- Leads and saved searches.
--
-- Both are the only tables the anonymous role may INSERT into, and it must
-- never be able to SELECT from either. That asymmetry is set in 010_rls.sql and
-- is verified by scripts/test-rls.ts.

create table leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text,
  message      text,
  lead_type    text not null default 'general'
               check (lead_type in
                 ('general','listing_inquiry','showing_request','seller',
                  'va','assumable','new_construction')),
  source_page  text,
  listing_id   uuid references listings(id) on delete set null,
  utm          jsonb,
  status       text not null default 'new'
               check (status in ('new','contacted','qualified','closed','spam')),
  notes        text,
  created_at   timestamptz not null default now(),

  constraint leads_email_shape check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint leads_name_len check (length(name) between 1 and 200),
  constraint leads_message_len check (message is null or length(message) <= 5000)
);

create index leads_inbox_idx on leads (status, created_at desc);
create index leads_listing_idx on leads (listing_id) where listing_id is not null;

-- ---------------------------------------------------------------------------
-- Listing alerts are commercial email, so double opt-in is not optional:
-- CAN-SPAM plus deliverability. See docs/09-compliance-legal.md § 5.
-- ---------------------------------------------------------------------------

create table saved_searches (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  label         text,
  query_json    jsonb not null default '{}'::jsonb,
  frequency     text not null default 'weekly'
                check (frequency in ('instant','daily','weekly')),
  confirmed     boolean not null default false,
  confirm_token text,
  unsubscribed  boolean not null default false,
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now(),

  constraint saved_searches_email_shape check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint saved_searches_unique unique (email, query_json),
  constraint saved_searches_query_is_object check (jsonb_typeof(query_json) = 'object')
);

create index saved_searches_due_idx
  on saved_searches (frequency, last_sent_at)
  where confirmed = true and unsubscribed = false;
