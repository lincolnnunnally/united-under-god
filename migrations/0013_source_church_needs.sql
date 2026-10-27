-- UUG SOURCE buying: a church posts a need, and we bid it out for it.
--
--   * a church posts what it needs on /buying/need, without an account;
--   * the desk starts a bid from the need, or adds it as a new line on an
--     open bid in the same category, so several churches' needs share one
--     bid (the grouping);
--   * quotes are recorded per line as today; vendors never see which church
--     a line is for;
--   * once its line has a priced quote, the desk sends the church its private
--     link (/buying/need/<token>), where it compares the quotes for its own
--     line only and chooses one, or none.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL,
-- preview builds included, so it reaches the production database on the
-- first preview build of the branch that adds it. It is therefore strictly
-- additive and idempotent:
--   * one new table (create table if not exists),
--   * new indexes (create index if not exists).
-- Nothing is dropped, renamed, retyped, or rewritten, and no existing row is
-- changed. bid_id, item_id, and chosen_quote_id are plain text with no
-- foreign key, so nothing here can fail on existing data, and a deleted bid
-- leaves the need readable. Code already deployed never reads this table and
-- is unaffected; running the file twice changes nothing.

create table if not exists source_church_needs (
  id text primary key,
  -- The church's private link. Kept as given (not hashed) so the desk can
  -- email the same link again when the quotes are in.
  token text not null,
  church_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  -- A church-spend category id ('' = something not on the list).
  category text not null default '',
  subcategory text not null default '',
  title text not null default '',
  details text not null default '',
  quantity text not null default '',
  needed_by text not null default '',
  -- new | bidding | quotes_sent | chosen | closed
  status text not null default 'new',
  -- The source_bid_requests id it was grouped into, and its line on that bid.
  bid_id text not null default '',
  item_id text not null default '',
  chosen_quote_id text not null default '',
  chosen_at timestamptz,
  -- What the church told us when none of the quotes worked.
  church_note text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists source_church_needs_token_idx
  on source_church_needs (token);
create index if not exists source_church_needs_status_idx
  on source_church_needs (status, created_at desc);
create index if not exists source_church_needs_bid_idx
  on source_church_needs (bid_id);
