-- How a vendor heard about the program (owner, 2026-11-18: the first vendor signed up and nothing showed
-- where they came from). source_vendors gains heard_from, what the vendor chose on the sign-up form
-- ("Google search", "A church", ... and their own words for "Other"), and came_from, where their browser
-- first came to this site from (src/lib/first-visit.ts: the sending site, the landing page, any utm).
-- '' = not given, as for every vendor who signed up before this.
--
-- Applied by scripts/migrate.mjs on every build that has DATABASE_URL, preview builds included. Strictly
-- additive and idempotent: two columns with a constant default (add column if not exists). Nothing is
-- dropped, renamed, retyped or rewritten. Code already deployed never names the columns.

alter table source_vendors add column if not exists heard_from text not null default '';
alter table source_vendors add column if not exists came_from text not null default '';
