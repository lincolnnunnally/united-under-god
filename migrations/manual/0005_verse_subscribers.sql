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
-- Apply this file as that same role. verse_reserve_confirm and
-- desk_reserve_send are granted to the role that runs this file, and to nobody else.

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

-- Solved proof-of-work challenges. One use each, so a single solution cannot spend the cap.
-- The app deletes rows older than 10 minutes. A challenge itself expires on that same clock.
create table if not exists verse_pow_used (
  challenge text primary key,
  used_at timestamptz not null default now()
);

create index if not exists verse_pow_used_used_idx on verse_pow_used (used_at);

-- Challenges handed to one IP bucket. The app allows 30 an hour and deletes rows older than two hours.
create table if not exists verse_pow_issued (
  id text primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists verse_pow_issued_ip_idx
  on verse_pow_issued (ip, created_at);

-- One row per IP bucket. used moves only while the hour window is open and still under 30.
-- A separate count-then-insert cannot do that: each app query commits on its own.
create table if not exists verse_pow_rate (
  bucket text primary key,
  window_start timestamptz not null,
  used integer not null,
  constraint verse_pow_rate_used_check check (used >= 0)
);

-- One row per lane and period. desk_reserve_send moves the day and the month
-- together, or neither.
--   desk:YYYY-MM-DD / desk:YYYY-MM — public replies, 5 a day and 15 a month
--   owner:YYYY-MM-DD / owner:YYYY-MM — notices to the owner, 20 a day and 40 a month
--   av:YYYY-MM-DD / av:YYYY-MM — church confirmations, 20 a day and 15 a month
create table if not exists desk_send_budget (
  bucket text primary key,
  used integer not null,
  updated_at timestamptz not null default now(),
  constraint desk_send_budget_used_check check (used >= 0)
);

-- A letter the cap held back. The desk lists these rows and does not change them.
create table if not exists desk_mail_skips (
  id text primary key,
  lane text not null,
  kind text not null default '',
  reason text not null,
  created_at timestamptz not null default now(),
  constraint desk_mail_skips_reason_check check (reason in ('daily cap', 'monthly cap'))
);

create index if not exists desk_mail_skips_created_idx on desk_mail_skips (created_at);

-- Atomic confirm reservations. used increases only while it is still under the cap.
-- bucket is day:YYYY-MM-DD, month:YYYY-MM, or net:<network>:YYYY-MM-DD.
create table if not exists verse_confirm_budget (
  bucket text primary key,
  used integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint verse_confirm_budget_used_check check (used >= 0)
);

alter table verse_subscribers enable row level security;
alter table verse_mail_runs enable row level security;
alter table verse_mail_deliveries enable row level security;
alter table verse_send_log enable row level security;
alter table verse_indexnow_log enable row level security;
alter table verse_subscribe_hits enable row level security;
alter table verse_pow_used enable row level security;
alter table verse_pow_issued enable row level security;
alter table verse_pow_rate enable row level security;
alter table verse_confirm_budget enable row level security;
alter table desk_send_budget enable row level security;
alter table desk_mail_skips enable row level security;

revoke all on table verse_subscribers from public;
revoke all on table verse_mail_runs from public;
revoke all on table verse_mail_deliveries from public;
revoke all on table verse_send_log from public;
revoke all on table verse_indexnow_log from public;
revoke all on table verse_subscribe_hits from public;
revoke all on table verse_pow_used from public;
revoke all on table verse_pow_issued from public;
revoke all on table verse_pow_rate from public;
revoke all on table verse_confirm_budget from public;
revoke all on table desk_send_budget from public;
revoke all on table desk_mail_skips from public;

-- One statement, so a day, a month, and a network are reserved together or not at all.
-- security invoker (the default): the caller still needs table privileges.
-- Execute is revoked from the Data API roles below.
create or replace function verse_reserve_confirm(
  day_bucket text,
  day_cap integer,
  month_bucket text,
  month_cap integer,
  net_bucket text,
  net_cap integer,
  other_today integer,
  other_month integer,
  daily_hard integer,
  monthly_hard integer
) returns text
language plpgsql
set search_path = pg_catalog, public
as $verse$
declare
  rec record;
  day_used integer := 0;
  month_used integer := 0;
  net_used integer := 0;
begin
  insert into public.verse_confirm_budget (bucket, used)
  values (day_bucket, 0), (month_bucket, 0), (net_bucket, 0)
  on conflict (bucket) do nothing;

  for rec in
    select bucket, used
    from public.verse_confirm_budget
    where bucket in (day_bucket, month_bucket, net_bucket)
    order by bucket
    for update
  loop
    if rec.bucket = day_bucket then
      day_used := rec.used;
    elsif rec.bucket = month_bucket then
      month_used := rec.used;
    elsif rec.bucket = net_bucket then
      net_used := rec.used;
    end if;
  end loop;

  if day_used >= day_cap
     or month_used >= month_cap
     or day_used + other_today >= daily_hard
     or month_used + other_month >= monthly_hard then
    return 'global';
  end if;
  if net_used >= net_cap then
    return 'net';
  end if;

  update public.verse_confirm_budget
  set used = used + 1, updated_at = now()
  where bucket in (day_bucket, month_bucket, net_bucket);
  return 'ok';
end
$verse$;

revoke all on function verse_reserve_confirm(text, integer, text, integer, text, integer, integer, integer, integer, integer) from public;
grant execute on function verse_reserve_confirm(text, integer, text, integer, text, integer, integer, integer, integer, integer) to current_user;

-- Day and month together. Returns ok, day, or month.
-- security invoker (the default): the caller still needs table privileges.
create or replace function desk_reserve_send(
  day_bucket text,
  day_cap integer,
  month_bucket text,
  month_cap integer
) returns text
language plpgsql
set search_path = pg_catalog, public
as $desk$
declare
  rec record;
  day_used integer := 0;
  month_used integer := 0;
begin
  insert into public.desk_send_budget (bucket, used)
  values (day_bucket, 0), (month_bucket, 0)
  on conflict (bucket) do nothing;

  for rec in
    select bucket, used
    from public.desk_send_budget
    where bucket in (day_bucket, month_bucket)
    order by bucket
    for update
  loop
    if rec.bucket = day_bucket then
      day_used := rec.used;
    elsif rec.bucket = month_bucket then
      month_used := rec.used;
    end if;
  end loop;

  if day_used >= day_cap then
    return 'day';
  end if;
  if month_used >= month_cap then
    return 'month';
  end if;

  update public.desk_send_budget
  set used = used + 1, updated_at = now()
  where bucket in (day_bucket, month_bucket);
  return 'ok';
end
$desk$;

revoke all on function desk_reserve_send(text, integer, text, integer) from public;
grant execute on function desk_reserve_send(text, integer, text, integer) to current_user;

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
        'verse_subscribe_hits',
        'verse_pow_used',
        'verse_pow_issued',
        'verse_pow_rate',
        'verse_confirm_budget',
        'desk_send_budget',
        'desk_mail_skips'
      ] loop
        execute format('revoke all on table %I from %I', table_name, role_name);
      end loop;
      execute format(
        'revoke all on function verse_reserve_confirm(text, integer, text, integer, text, integer, integer, integer, integer, integer) from %I',
        role_name
      );
      execute format(
        'revoke all on function desk_reserve_send(text, integer, text, integer) from %I',
        role_name
      );
    end if;
  end loop;
end $$;
