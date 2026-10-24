-- Church directory counts by state for /buying/sell-to-churches.
--
-- Counting cc_churches live reads every JSONB row (about 9 s on production),
-- so the page timed out and hid its numbers. This keeps the counts in a small
-- materialized view, refreshed nightly by pg_cron. Same filter as the live
-- query: rows folded into another listing (directory_status = 'merged') are
-- duplicates and do not count. State normalization stays in
-- src/lib/church-market.ts.
--
-- Additive and idempotent. Skipped where cc_churches does not exist (local
-- PGLite), and the cron job is skipped where pg_cron is not installed.
do $$
begin
  if to_regclass('public.cc_churches') is not null
     and to_regclass('public.uug_church_state_counts') is null then
    execute $v$
      create materialized view public.uug_church_state_counts as
        select coalesce(upper(trim(doc->>'state')), '') as state, count(*)::int as n
        from public.cc_churches
        where coalesce(doc->>'directory_status', '') <> 'merged'
        group by 1
    $v$;
    execute 'create unique index if not exists uug_church_state_counts_state on public.uug_church_state_counts (state)';
  end if;

  -- Nested so cron.job is never named where pg_cron is not installed (local
  -- PGLite): Postgres plans the whole condition, so an AND does not protect it.
  if to_regclass('public.uug_church_state_counts') is not null
     and to_regclass('cron.job') is not null then
    if not exists (select 1 from cron.job where jobname = 'uug_church_state_counts_refresh') then
      begin
        perform cron.schedule(
          'uug_church_state_counts_refresh',
          '41 7 * * *',
          'refresh materialized view concurrently public.uug_church_state_counts'
        );
      exception when others then
        -- No permission to schedule: the counts stay as built until refreshed by hand.
        raise notice 'uug_church_state_counts refresh not scheduled: %', sqlerrm;
      end;
    end if;
  end if;
end
$$;
