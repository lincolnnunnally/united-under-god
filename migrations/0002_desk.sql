-- Desk: public inquiries, staff, and who gets notified for each kind of job.

create table if not exists inquiries (
  id text primary key,
  kind text not null,
  kinds text not null default '',
  name text not null,
  email text not null default '',
  phone text not null default '',
  organization text not null default '',
  city text not null default '',
  address text not null default '',
  message text not null default '',
  details text not null default '{}',
  status text not null default 'new',
  assigned_to text,
  scheduled_for text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inquiries_created_idx on inquiries (created_at desc);
create index if not exists inquiries_kind_idx on inquiries (kind);
create index if not exists inquiries_status_idx on inquiries (status);

create table if not exists staff (
  id text primary key,
  name text not null,
  email text not null,
  role text not null default 'hand',
  kinds text not null default 'all',
  pickup boolean not null default false,
  active boolean not null default true,
  user_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists staff_email_idx on staff (email);

create table if not exists notify_routes (
  id text primary key,
  email text not null,
  kinds text not null default 'all',
  role text not null default 'always',
  label text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists email_log (
  id text primary key,
  inquiry_id text,
  to_email text not null,
  subject text not null,
  status text not null,
  error text not null default '',
  created_at timestamptz not null default now()
);

insert into staff (id, name, email, role, kinds, pickup, active)
values
  ('staff-lincoln-uug', 'Lincoln Nunnally', 'lincoln@unitedundergod.org', 'super', 'all', true, true),
  ('staff-lincoln-gmail', 'Lincoln Nunnally', 'lincoln.nunnally@gmail.com', 'super', 'all', true, true)
on conflict (id) do nothing;

insert into notify_routes (id, email, kinds, role, label)
values
  ('route-lincoln-uug', 'lincoln@unitedundergod.org', 'all', 'always', 'Lincoln'),
  ('route-lincoln-gmail', 'lincoln.nunnally@gmail.com', 'all', 'always', 'Lincoln backup')
on conflict (id) do nothing;
