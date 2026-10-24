-- UUG SOURCE buying: the vendor portal, ranking inputs, verified reviews,
-- vendor files, and catalog messages.
--
--   * vendors sign in to a portal by a one-time emailed link and keep a
--     session; both store only a SHA-256 of their token;
--   * a vendor edits its profile (category changes wait for owner approval),
--     sets the rate it offers per category (at or above the floor), uploads
--     files, and reports program sales and closed jobs monthly;
--   * a church reviews a vendor only from a private link sent after a real
--     program job; hiding a review is logged with its reason;
--   * the owner sends one message to every approved vendor in a catalog.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL,
-- preview builds included, so it reaches the production database on the
-- first preview build of the branch that adds it. It is therefore strictly
-- additive and idempotent:
--   * new tables (create table if not exists),
--   * new columns with defaults (add column if not exists),
--   * new indexes (create index if not exists).
-- Nothing is dropped, renamed, retyped, or rewritten. Code already deployed
-- never reads these and is unaffected; running the file twice changes nothing.

-- Profile fields a vendor edits in the portal. Category changes are held in
-- requested_categories until the owner approves them on the desk.
alter table source_vendors
  add column if not exists description text not null default '';
alter table source_vendors
  add column if not exists requested_categories jsonb not null default '[]'::jsonb;
alter table source_vendors
  add column if not exists categories_requested_at timestamptz;
alter table source_vendors
  add column if not exists profile_updated_at timestamptz;

-- The portal's own private link to a bid the vendor was invited to, so
-- opening it from the portal does not replace the link in the email.
alter table source_bid_invites
  add column if not exists portal_token_hash text not null default '';
create unique index if not exists source_bid_invites_portal_token_idx
  on source_bid_invites (portal_token_hash) where portal_token_hash <> '';

-- The rate a vendor offers per catalog category, in percent. Null means the
-- floor from src/lib/vendor-terms.ts. The app refuses anything below it.
create table if not exists source_vendor_offers (
  vendor_id text not null references source_vendors (id) on delete cascade,
  category text not null,
  rebate_percent numeric(5, 2),
  referral_percent numeric(5, 2),
  updated_at timestamptz not null default now(),
  primary key (vendor_id, category)
);

-- One-time sign-in links (expire after minutes, used once).
create table if not exists source_vendor_login_links (
  id text primary key,
  vendor_id text not null references source_vendors (id) on delete cascade,
  token_hash text not null unique,
  email text not null default '',
  email_status text not null default '',
  email_error text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists source_vendor_login_links_vendor_idx
  on source_vendor_login_links (vendor_id, created_at desc);

-- Portal sessions (the cookie holds the token; the row holds its hash).
create table if not exists source_vendor_sessions (
  id text primary key,
  vendor_id text not null references source_vendors (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz
);
create index if not exists source_vendor_sessions_vendor_idx
  on source_vendor_sessions (vendor_id, created_at desc);

-- Brochures, price sheets, and package and service descriptions. Stored in
-- Postgres (no file service): PDF, JPG, PNG, or WebP, 5 MB each, 20 per
-- vendor. status: uploading | ready. Only ready files are served.
create table if not exists source_vendor_files (
  id text primary key,
  vendor_id text not null references source_vendors (id) on delete cascade,
  category text not null default '',
  kind text not null default 'brochure',
  title text not null default '',
  filename text not null default '',
  content_type text not null,
  size_bytes integer not null default 0,
  content bytea not null default ''::bytea,
  status text not null default 'uploading',
  created_at timestamptz not null default now(),
  ready_at timestamptz
);
create index if not exists source_vendor_files_vendor_idx
  on source_vendor_files (vendor_id, created_at);

-- Monthly program reports. kind: sales | job | none (a month with none).
-- A closed job names the church contact, who is sent a review request.
create table if not exists source_vendor_reports (
  id text primary key,
  vendor_id text not null references source_vendors (id) on delete cascade,
  month text not null,
  kind text not null,
  category text not null default '',
  amount text not null default '',
  description text not null default '',
  church_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  closed_on text not null default '',
  review_request_id text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists source_vendor_reports_vendor_idx
  on source_vendor_reports (vendor_id, month desc);

-- A private link asking a church to review a vendor after a real program
-- job. origin: desk (the owner sent it) | report (a vendor reported the job).
create table if not exists source_review_requests (
  id text primary key,
  vendor_id text not null references source_vendors (id) on delete cascade,
  category text not null default '',
  church_name text not null,
  contact_name text not null default '',
  email text not null,
  job text not null default '',
  origin text not null default 'desk',
  report_id text not null default '',
  token_hash text not null unique,
  email_status text not null default '',
  email_error text not null default '',
  sent_by text not null default '',
  sent_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists source_review_requests_vendor_idx
  on source_review_requests (vendor_id, sent_at desc);

-- One review per request. status: published | hidden. Hidden only for abuse,
-- profanity, or private information; a hidden review's ratings still count.
create table if not exists source_vendor_reviews (
  id text primary key,
  request_id text not null unique references source_review_requests (id) on delete cascade,
  vendor_id text not null references source_vendors (id) on delete cascade,
  category text not null default '',
  overall integer not null,
  quality integer not null,
  on_time boolean not null,
  bill_matched boolean not null,
  hire_again boolean not null,
  comment text not null default '',
  show_church_name boolean not null default false,
  church_name text not null default '',
  status text not null default 'published',
  hidden_reason text not null default '',
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists source_vendor_reviews_vendor_idx
  on source_vendor_reviews (vendor_id, created_at desc);

-- Every hide and unhide, with its reason and who did it.
create table if not exists source_review_moderation (
  id text primary key,
  review_id text not null references source_vendor_reviews (id) on delete cascade,
  action text not null,
  reason text not null default '',
  note text not null default '',
  author text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists source_review_moderation_review_idx
  on source_review_moderation (review_id, created_at);

-- One message from the owner to every approved vendor in a catalog. send_key
-- comes from the desk's preview, so pressing Send twice sends once.
create table if not exists source_broadcasts (
  id text primary key,
  send_key text not null unique,
  category text not null,
  subcategory text not null default '',
  area text not null default '',
  subject text not null,
  body text not null,
  sent_by text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists source_broadcast_sends (
  id text primary key,
  broadcast_id text not null references source_broadcasts (id) on delete cascade,
  vendor_id text not null references source_vendors (id) on delete cascade,
  email text not null default '',
  email_status text not null default '',
  email_error text not null default '',
  sent_at timestamptz not null default now(),
  unique (broadcast_id, vendor_id)
);
