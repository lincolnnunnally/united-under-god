-- Member churches ($20 a month, per church), Stripe event bookkeeping, and
-- pastor fellowship interest by area.
--
-- Strictly additive and idempotent: every statement is create ... if not
-- exists, so a re-run (or a preview build that reaches production first) is a
-- no-op. Nothing here alters or drops an existing table.

-- One row per church, keyed by the account that signed it up (better-auth
-- "user".id, text). status: pending | active | past_due | canceled.
-- Access to member content: active and past_due (Stripe is still retrying).
create table if not exists uug_member_churches (
  user_id text primary key,
  church_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  website text not null default '',
  status text not null default 'pending',
  stripe_customer_id text not null default '',
  stripe_subscription_id text not null default '',
  current_period_end timestamptz,
  -- Stripe event.created (unix seconds) of the last event applied, so an
  -- older event delivered late never overwrites a newer status.
  stripe_event_at bigint not null default 0,
  member_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists uug_member_churches_status_idx on uug_member_churches (status);
create index if not exists uug_member_churches_customer_idx on uug_member_churches (stripe_customer_id);
create index if not exists uug_member_churches_subscription_idx on uug_member_churches (stripe_subscription_id);

-- Every Stripe webhook event applied, by event id. A redelivered event is
-- skipped.
create table if not exists uug_stripe_events (
  id text primary key,
  type text not null default '',
  received_at timestamptz not null default now()
);

-- Pastors who want a weekly coffee meetup. area_key is ZIP3 ("zip3:304")
-- when a ZIP is given, else city + state ("city:vidalia-ga").
create table if not exists uug_fellowship_interest (
  id text primary key,
  user_id text,
  name text not null,
  church text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  area_key text not null,
  area_label text not null default '',
  preferred_day text not null default '',
  preferred_time text not null default '',
  is_member boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists uug_fellowship_interest_area_idx on uug_fellowship_interest (area_key);
create index if not exists uug_fellowship_interest_created_idx on uug_fellowship_interest (created_at desc);

-- One row per area once someone in it signs up. notified_at is set exactly
-- once, when the area first reaches the threshold and the owner is emailed.
create table if not exists uug_fellowship_areas (
  area_key text primary key,
  label text not null default '',
  status text not null default 'gathering',
  meeting_place text not null default '',
  meeting_time text not null default '',
  notified_at timestamptz,
  started_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
