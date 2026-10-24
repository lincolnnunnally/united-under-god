-- UUG SOURCE buying: honoring the program price.
--
--   * every quote names a senior person at the vendor who is authorized to
--     bind the company to the quoted prices, with a ticked attestation (time,
--     and the IP for an online quote);
--   * a vendor keeps a default price contact in its portal profile;
--   * every awarded price in the buying book gets a reference code
--     (UUG-2026-0142) and a price term (effective date, good-through date);
--     the owner sets the term per bid (6, 12, or a custom number of months);
--   * 45 days before a term ends the owner is reminded (once per term, one
--     digest email a day at most), can ask the vendor to confirm or update,
--     and approves a confirmation before the term is extended;
--   * a member church can tell us it ordered at the program price, so the
--     owner can compare with the vendor's monthly reports;
--   * a church can report "Program price not honored" with the reference.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL,
-- preview builds included, so it reaches the production database on the
-- first preview build of the branch that adds it. It is therefore strictly
-- additive and idempotent:
--   * new tables (create table if not exists),
--   * new columns with defaults (add column if not exists),
--   * new indexes (create index if not exists).
-- Nothing is dropped, renamed, retyped, or rewritten, and no existing row is
-- changed: book entries published before this get their reference and term
-- from the app, the first time the desk or the daily job reads them. Code
-- already deployed never reads these and is unaffected; running the file
-- twice changes nothing.

-- The authorized price contact and attestation on each quote.
alter table source_quotes
  add column if not exists price_contact_name text not null default '';
alter table source_quotes
  add column if not exists price_contact_title text not null default '';
alter table source_quotes
  add column if not exists price_contact_email text not null default '';
alter table source_quotes
  add column if not exists price_contact_phone text not null default '';
-- The exact words attested, when, and from which IP ('' for a desk quote).
alter table source_quotes
  add column if not exists price_attestation text not null default '';
alter table source_quotes
  add column if not exists price_attested_at timestamptz;
alter table source_quotes
  add column if not exists price_attested_ip text not null default '';
-- '' | updated: the vendor sent updated prices from the portal for the owner
-- to publish.
alter table source_quotes
  add column if not exists refresh_status text not null default '';

-- A vendor's default price contact, prefilled on its quotes.
alter table if exists source_vendors
  add column if not exists price_contact_name text not null default '';
alter table if exists source_vendors
  add column if not exists price_contact_title text not null default '';
alter table if exists source_vendors
  add column if not exists price_contact_email text not null default '';
alter table if exists source_vendors
  add column if not exists price_contact_phone text not null default '';

-- The price term the owner sets per bid, in months.
alter table source_bid_requests
  add column if not exists price_term_months integer not null default 12;

-- The program price reference and term on each awarded price, and the price
-- contact as it stood when the price was published.
alter table source_buying_book
  add column if not exists reference_code text not null default '';
alter table source_buying_book
  add column if not exists effective_on text not null default '';
alter table source_buying_book
  add column if not exists expires_on text not null default '';
alter table source_buying_book
  add column if not exists term_months integer not null default 12;
alter table source_buying_book
  add column if not exists price_contact_name text not null default '';
alter table source_buying_book
  add column if not exists price_contact_title text not null default '';
alter table source_buying_book
  add column if not exists price_contact_email text not null default '';
alter table source_buying_book
  add column if not exists price_contact_phone text not null default '';
create unique index if not exists source_buying_book_reference_idx
  on source_buying_book (reference_code) where reference_code <> '';
create index if not exists source_buying_book_expires_idx
  on source_buying_book (expires_on);

-- The last reference number handed out each year (UUG-<year>-<number>).
create table if not exists source_reference_counters (
  year integer primary key,
  last integer not null default 0
);

-- Every earlier term of a book entry: extended, or replaced by updated prices.
create table if not exists source_book_history (
  id text primary key,
  book_id text not null references source_buying_book (id) on delete cascade,
  reference_code text not null default '',
  unit_price text not null default '',
  effective_on text not null default '',
  expires_on text not null default '',
  price_contact_name text not null default '',
  price_contact_title text not null default '',
  price_contact_email text not null default '',
  price_contact_phone text not null default '',
  -- extended | updated
  reason text not null default '',
  changed_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists source_book_history_book_idx
  on source_book_history (book_id, created_at desc);

-- Price reviews on a book entry.
--   kind request: the owner asked the vendor to confirm or update
--     (status sent | failed);
--   kind confirm: the vendor confirmed the prices unchanged for a new term
--     (status pending | approved | declined; only approved extends it).
create table if not exists source_price_reviews (
  id text primary key,
  book_id text not null references source_buying_book (id) on delete cascade,
  vendor_id text not null default '',
  kind text not null,
  status text not null default '',
  email text not null default '',
  email_error text not null default '',
  price_contact_name text not null default '',
  price_contact_title text not null default '',
  price_contact_email text not null default '',
  price_contact_phone text not null default '',
  attestation text not null default '',
  ip text not null default '',
  for_expires_on text not null default '',
  decided_by text not null default '',
  decided_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists source_price_reviews_book_idx
  on source_price_reviews (book_id, created_at desc);

-- The 45-day reminder, once per book entry per term (its good-through date).
create table if not exists source_price_reminders (
  book_id text not null references source_buying_book (id) on delete cascade,
  expires_on text not null,
  digest_day text not null default '',
  created_at timestamptz not null default now(),
  primary key (book_id, expires_on)
);

-- At most one reminder digest email per day. status: sending | sent | failed.
create table if not exists source_price_digests (
  day text primary key,
  status text not null default 'sending',
  entries integer not null default 0,
  error text not null default '',
  created_at timestamptz not null default now()
);

-- "We ordered this": a member church tells us it ordered at the program
-- price. Only the owner's desk reads these; no church sees another's.
create table if not exists source_member_orders (
  id text primary key,
  book_id text not null default '',
  reference_code text not null default '',
  vendor_id text not null default '',
  vendor_name text not null default '',
  title text not null default '',
  user_id text not null default '',
  church_name text not null default '',
  quantity text not null default '',
  ordered_on text not null default '',
  amount text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists source_member_orders_vendor_idx
  on source_member_orders (vendor_id, ordered_on desc);
create index if not exists source_member_orders_user_idx
  on source_member_orders (user_id, created_at desc);

-- "Report a problem": the kind of problem and the program reference given.
alter table if exists source_cases
  add column if not exists problem_type text not null default '';
alter table if exists source_cases
  add column if not exists reference_code text not null default '';
