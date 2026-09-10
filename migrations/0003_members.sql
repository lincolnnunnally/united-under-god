-- Public movement accounts (churches, businesses, charities, households).
-- Staff remain in the staff table. Pantry neighbors sign in on Plenty.

create table if not exists members (
  user_id text primary key,
  name text not null default '',
  email text not null default '',
  organization text not null default '',
  org_type text not null default '',
  city text not null default '',
  phone text not null default '',
  wants_seal boolean not null default false,
  wants_buying boolean not null default false,
  wants_mission boolean not null default false,
  wants_volunteer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists members_created_idx on members (created_at desc);
create index if not exists members_email_idx on members (email);
