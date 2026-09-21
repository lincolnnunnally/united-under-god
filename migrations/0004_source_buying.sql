-- UUG SOURCE buying. Owned by this site (united-under-god).
-- Not AppEngine group-buy tables (no gb_*).
--
-- Shapes harvested, not copied, from ChurchConnect:
--   cooperative_purchasing — bid request, vendor response, multi-winner
--     award (more than one winner per item is allowed), purchasing book
--   business_services — quote request / quote response
-- Operators record quotes on this desk. There is no vendor portal here.

create table if not exists source_bid_requests (
  id text primary key,
  title text not null,
  summary text not null default '',
  needed_by text not null default '',
  status text not null default 'open',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists source_bid_requests_created_idx
  on source_bid_requests (created_at desc);

create table if not exists source_bid_items (
  id text primary key,
  bid_id text not null references source_bid_requests (id) on delete cascade,
  description text not null,
  quantity text not null default '1',
  unit text not null default '',
  sort_order integer not null default 0
);
create index if not exists source_bid_items_bid_idx
  on source_bid_items (bid_id, sort_order);

create table if not exists source_quotes (
  id text primary key,
  bid_id text not null references source_bid_requests (id) on delete cascade,
  vendor_name text not null,
  vendor_contact text not null default '',
  notes text not null default '',
  status text not null default 'received',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists source_quotes_bid_idx
  on source_quotes (bid_id, created_at);

create table if not exists source_quote_lines (
  id text primary key,
  quote_id text not null references source_quotes (id) on delete cascade,
  item_id text not null references source_bid_items (id) on delete cascade,
  unit_price text not null default '',
  notes text not null default '',
  unique (quote_id, item_id)
);

create table if not exists source_awards (
  id text primary key,
  item_id text not null references source_bid_items (id) on delete cascade,
  quote_id text not null references source_quotes (id) on delete cascade,
  awarded_by text not null default '',
  created_at timestamptz not null default now(),
  unique (item_id, quote_id)
);
create index if not exists source_awards_item_idx on source_awards (item_id);

create table if not exists source_buying_book (
  id text primary key,
  award_id text not null unique references source_awards (id) on delete cascade,
  bid_id text not null,
  item_id text not null,
  title text not null,
  vendor_name text not null,
  unit_price text not null default '',
  unit text not null default '',
  quantity text not null default '',
  notes text not null default '',
  published_by text not null default '',
  published_at timestamptz not null default now()
);
create index if not exists source_buying_book_published_idx
  on source_buying_book (published_at desc);
