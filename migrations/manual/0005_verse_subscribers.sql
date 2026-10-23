-- Daily verse email list for unitedundergod.org.
--
-- DO NOT auto-apply. This file lives in migrations/manual/ on purpose.
-- scripts/migrate.mjs and the deploy build only read migrations/*.sql
-- (non-recursive). Preview and production both have DATABASE_URL, so a file
-- in migrations/ would be applied on the next Vercel build. Apply this file
-- yourself on the Life Produces Life database when you are ready.
--
-- Local PGLite (no DATABASE_URL) does apply this folder so dev and tests can
-- sign up. That in-memory database is not Life Produces Life.
--
-- The app connects with DATABASE_URL (table owner) and bypasses RLS.
-- The Data API roles get no grants and no policies, so anon cannot read
-- or write these rows. There is no policy that allows a public select.

create table if not exists verse_subscribers (
  id text primary key,
  email text not null,
  status text not null default 'pending',
  source_path text not null default '',
  consent_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  confirm_sent_at timestamptz,
  -- confirm_send_count is how many confirmation notes went out during the UTC day
  -- that started at confirm_window_started_at. It resets on the next day.
  confirm_send_count integer not null default 0,
  confirm_window_started_at timestamptz,
  last_daily_sent_at timestamptz,
  constraint verse_subscribers_email_unique unique (email),
  constraint verse_subscribers_status_check check (status in ('pending', 'confirmed', 'unsubscribed'))
);

create index if not exists verse_subscribers_confirmed_send_idx
  on verse_subscribers (last_daily_sent_at, id)
  where status = 'confirmed';

create table if not exists verse_mail_runs (
  date_key text primary key,
  status text not null default 'started',
  sent_count integer not null default 0,
  skipped_count integer not null default 0,
  stopped_reason text not null default '',
  attempt integer not null default 0,
  -- Written before the provider call so a retry can reuse the same people and key.
  recipient_ids text not null default '',
  idempotency_key text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint verse_mail_runs_status_check check (
    status in ('started', 'sending', 'sent', 'partial', 'capped')
  )
);

create table if not exists verse_mail_deliveries (
  date_key text not null references verse_mail_runs (date_key) on delete cascade,
  subscriber_id text not null references verse_subscribers (id) on delete cascade,
  status text not null,
  error text not null default '',
  sent_at timestamptz,
  primary key (date_key, subscriber_id),
  constraint verse_mail_deliveries_status_check check (status in ('sent', 'failed'))
);

create index if not exists verse_mail_deliveries_sent_idx
  on verse_mail_deliveries (sent_at)
  where status = 'sent';

create table if not exists verse_send_log (
  id text primary key,
  kind text not null,
  subscriber_id text,
  date_key text not null default '',
  status text not null,
  created_at timestamptz not null default now(),
  constraint verse_send_log_kind_check check (kind in ('confirm', 'daily')),
  constraint verse_send_log_status_check check (status in ('sent', 'failed', 'skipped'))
);

create index if not exists verse_send_log_created_idx on verse_send_log (created_at);

create table if not exists verse_indexnow_log (
  slug text primary key,
  url text not null,
  http_status integer,
  submitted_at timestamptz not null default now()
);

-- Sign-up attempts by IP. No email address is stored here.
create table if not exists verse_subscribe_hits (
  id text primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists verse_subscribe_hits_ip_idx
  on verse_subscribe_hits (ip, created_at);

alter table verse_subscribers enable row level security;
alter table verse_mail_runs enable row level security;
alter table verse_mail_deliveries enable row level security;
alter table verse_send_log enable row level security;
alter table verse_indexnow_log enable row level security;
alter table verse_subscribe_hits enable row level security;

revoke all on table verse_subscribers from public;
revoke all on table verse_mail_runs from public;
revoke all on table verse_mail_deliveries from public;
revoke all on table verse_send_log from public;
revoke all on table verse_indexnow_log from public;
revoke all on table verse_subscribe_hits from public;

do $$
declare
  role_name text;
  table_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      foreach table_name in array array[
        'verse_subscribers',
        'verse_mail_runs',
        'verse_mail_deliveries',
        'verse_send_log',
        'verse_indexnow_log',
        'verse_subscribe_hits'
      ] loop
        execute format('revoke all on table %I from %I', table_name, role_name);
      end loop;
    end if;
  end loop;
end $$;
