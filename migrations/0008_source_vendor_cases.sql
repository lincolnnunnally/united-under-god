-- UUG SOURCE buying: the Vendor Covenant and the accountability behind it.
-- A church reports a problem with a program vendor at /buying/report; each
-- report is a case on the desk. United Under God hears both sides (the
-- vendor answers by a private link), may appoint mediators from a reusable
-- committee list, records a decision and a remedy, and follows it through.
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
--
-- Every private link stores only a SHA-256 of its token; the token itself
-- exists only in the email that was sent.

-- One row per church report. status: open | waiting_vendor | mediation |
-- decided | closed.
create table if not exists source_cases (
  id text primary key,
  status text not null default 'open',
  church_name text not null,
  contact_name text not null default '',
  email text not null,
  phone text not null default '',
  vendor_id text not null references source_vendors (id),
  -- The vendor's company name when the report came in.
  vendor_name text not null default '',
  purchase text not null default '',
  purchased_on text not null default '',
  problem text not null default '',
  wanted text not null default '',
  report_ip text not null default '',
  -- The vendor's private response link and the response expectation.
  vendor_token_hash text not null default '',
  vendor_notified_at timestamptz,
  vendor_response_due text not null default '',
  vendor_responded_at timestamptz,
  -- The decision. finding: at_fault | partly | not_at_fault.
  -- remedy_kind: none | repair | redo | credit | refund | other.
  -- consequence: none | warning | probation | suspension | revocation.
  finding text not null default '',
  remedy_kind text not null default '',
  remedy_text text not null default '',
  remedy_due text not null default '',
  consequence text not null default '',
  decision_note text not null default '',
  decided_by text not null default '',
  decided_at timestamptz,
  -- Follow-through. remedy_status: '' | pending | done | not_done.
  remedy_status text not null default '',
  remedy_marked_at timestamptz,
  church_told_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists source_cases_status_idx
  on source_cases (status, created_at desc);
create index if not exists source_cases_vendor_idx
  on source_cases (vendor_id, created_at desc);
create unique index if not exists source_cases_vendor_token_idx
  on source_cases (vendor_token_hash) where vendor_token_hash <> '';

-- The case timeline: the church's report, the vendor's response, notes,
-- messages, mediator recommendations, the decision, and follow-through.
-- Every entry has its time and its author.
create table if not exists source_case_events (
  id text primary key,
  case_id text not null references source_cases (id) on delete cascade,
  kind text not null,
  author text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists source_case_events_case_idx
  on source_case_events (case_id, created_at);

-- The reusable list of people who can mediate a case.
create table if not exists source_committee (
  id text primary key,
  name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists source_committee_email_idx
  on source_committee (lower(email));

-- Mediators chosen for a case, each with a private link to read it and add a
-- recommendation.
create table if not exists source_case_mediators (
  id text primary key,
  case_id text not null references source_cases (id) on delete cascade,
  person_id text not null references source_committee (id) on delete cascade,
  token_hash text not null default '',
  email_status text not null default '',
  email_error text not null default '',
  sent_at timestamptz,
  assigned_by text not null default '',
  assigned_at timestamptz not null default now(),
  unique (case_id, person_id)
);
create unique index if not exists source_case_mediators_token_idx
  on source_case_mediators (token_hash) where token_hash <> '';

-- Private links for a vendor to accept a new version of the Vendor Covenant
-- and Vendor Terms.
create table if not exists source_covenant_links (
  id text primary key,
  vendor_id text not null references source_vendors (id) on delete cascade,
  token_hash text not null unique,
  terms_version text not null default '',
  email text not null default '',
  email_status text not null default '',
  email_error text not null default '',
  sent_by text not null default '',
  sent_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists source_covenant_links_vendor_idx
  on source_covenant_links (vendor_id, sent_at desc);

-- The vendor's current standing consequence from a decided case: '' (none),
-- warning, probation, suspension, or revocation, and the case it came from.
alter table source_vendors
  add column if not exists consequence text not null default '';
alter table source_vendors
  add column if not exists consequence_case_id text not null default '';
alter table source_vendors
  add column if not exists consequence_at timestamptz;
