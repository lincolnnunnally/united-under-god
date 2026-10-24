-- UUG SOURCE buying: vendor sign-up, bid invitations, and quotes submitted
-- online by an invited vendor.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL,
-- preview builds included, so it reaches the production database on the
-- first preview build of the branch that adds it. It is therefore strictly
-- additive and idempotent:
--   * two new tables (create table if not exists),
--   * new columns with defaults (add column if not exists),
--   * new indexes (create index if not exists).
-- Nothing is dropped, renamed, retyped, or rewritten. Code already deployed
-- never reads these and is unaffected; running the file twice changes nothing.

-- Vendors who signed up at /buying/vendors. status: pending | approved |
-- paused | removed. Only approved vendors are invited to bids.
create table if not exists source_vendors (
  id text primary key,
  company text not null,
  contact_name text not null default '',
  email text not null,
  phone text not null default '',
  website text not null default '',
  -- "category/subcategory" keys from src/data/church-spend.json.
  categories jsonb not null default '[]'::jsonb,
  -- Two-letter state codes, and an optional list of cities or ZIP codes.
  states jsonb not null default '[]'::jsonb,
  places jsonb not null default '[]'::jsonb,
  nationwide boolean not null default false,
  liability_insured boolean not null default false,
  notes text not null default '',
  status text not null default 'pending',
  -- Vendor Terms acceptance: which version, when, and from which IP.
  terms_version text not null default '',
  terms_accepted_at timestamptz,
  terms_ip text not null default '',
  reviewed_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists source_vendors_status_idx
  on source_vendors (status, created_at desc);
create index if not exists source_vendors_email_idx
  on source_vendors (lower(email));

-- One invitation per vendor per bid. Only a SHA-256 of the link token is
-- stored; the token itself exists only in the email that was sent.
create table if not exists source_bid_invites (
  id text primary key,
  bid_id text not null references source_bid_requests (id) on delete cascade,
  vendor_id text not null references source_vendors (id) on delete cascade,
  token_hash text not null unique,
  email text not null default '',
  subject text not null default '',
  -- sent | failed (a failed send can be retried with a fresh token)
  email_status text not null default '',
  email_error text not null default '',
  sent_by text not null default '',
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  unique (bid_id, vendor_id)
);
create index if not exists source_bid_invites_bid_idx
  on source_bid_invites (bid_id, sent_at);

-- Where a bid is to be served: two-letter state codes, comma separated.
-- Blank means anywhere.
alter table source_bid_requests
  add column if not exists area text not null default '';

-- A quote typed in at the desk has source 'desk' and no vendor_id. A quote an
-- invited vendor submitted on its bid page has source 'online' and its vendor.
alter table source_quotes
  add column if not exists vendor_id text not null default '';
alter table source_quotes
  add column if not exists source text not null default 'desk';
create unique index if not exists source_quotes_online_vendor_idx
  on source_quotes (bid_id, vendor_id) where vendor_id <> '';
