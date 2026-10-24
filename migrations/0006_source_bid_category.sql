-- UUG SOURCE buying: a bid carries a category from the church spend list
-- (src/data/church-spend.json), and each bid line can remember which list
-- item it came from, so the buying book can be shown by category and the
-- desk can see which categories have no bids yet.
--
-- DO NOT auto-apply. This file lives in migrations/manual/ on purpose.
-- scripts/migrate.mjs and the deploy build only read migrations/*.sql
-- (non-recursive). Preview and production both have DATABASE_URL, so a file
-- in migrations/ would be applied by the first preview build of this branch.
-- Local PGLite (no DATABASE_URL) does apply this folder, so dev and tests work.
--
-- Additive and idempotent: three text columns with '' defaults. Code already
-- deployed ignores them, and running it twice changes nothing.
--
-- Apply on the Life Produces Life database, as the role in DATABASE_URL,
-- BEFORE the code that writes these columns is deployed:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 \
--     -f migrations/manual/0006_source_bid_category.sql \
--     -c "insert into _migrations (name) values ('0006_source_bid_category.sql') on conflict do nothing"
-- (No self-recording here: the PGLite applier records the name itself and a
-- duplicate insert would fail its transaction.)

alter table source_bid_requests
  add column if not exists category text not null default '';
alter table source_bid_requests
  add column if not exists subcategory text not null default '';
create index if not exists source_bid_requests_category_idx
  on source_bid_requests (category, status);

alter table source_bid_items
  add column if not exists catalog_item text not null default '';

