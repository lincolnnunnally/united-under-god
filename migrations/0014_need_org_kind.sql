-- Needs from every member group buying serves, not only churches.
--
-- source_church_needs gains org_kind: church | ministry | business (a
-- charity or ministry, or a Christian-owned business). Every existing row was
-- posted by a church, so the default keeps it one.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL,
-- preview builds included. Strictly additive and idempotent: one column,
-- add column if not exists, with a constant default. Nothing is dropped,
-- renamed, retyped or rewritten. Code already deployed never names the
-- column and is unaffected.

alter table source_church_needs
  add column if not exists org_kind text not null default 'church';
