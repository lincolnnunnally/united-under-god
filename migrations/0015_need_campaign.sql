-- Which campaign brought a need in: source_church_needs gains campaign, the
-- slug of a campaign in src/lib/campaigns.ts ('' = the need came straight to
-- /buying/need). The LED wall campaign (/church-av/led-wall) is the first:
-- a church describes its room once, and three church AV companies bid on it.
-- The staff desk's Campaigns page counts needs by this column.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL,
-- preview builds included. Strictly additive and idempotent: one column with
-- a constant default (add column if not exists) and one index (create index
-- if not exists). Nothing is dropped, renamed, retyped or rewritten. Code
-- already deployed never names the column and is unaffected.

alter table source_church_needs
  add column if not exists campaign text not null default '';
create index if not exists source_church_needs_campaign_idx
  on source_church_needs (campaign, created_at desc);
