-- kinterGARDEN — schema + RLS
-- Run this once in the Supabase SQL editor on a fresh project.
-- After running: Authentication -> Providers -> Email -> disable "Allow new users to sign up",
-- then invite the two users from Authentication -> Users -> Invite user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists school_years (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,                    -- "2026–2027"
  start_date  date not null,
  end_date    date not null,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- One row per invited auth user. id = auth.uid().
create table if not exists profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text,
  role          text not null default 'teacher' check (role in ('admin', 'teacher')),
  created_at    timestamptz not null default now()
);

create table if not exists students (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references school_years (id) on delete cascade,
  first_name     text not null,
  last_initial   text not null default '',
  avatar_color   text not null default '#C8A2E8',
  avatar_emoji   text not null default '🦋',
  status         text not null default 'active' check (status in ('active', 'archived')),
  private_notes  text not null default '',
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Pinned notes: allergies, IEP/plans, special needs, or a general description
-- — things you want to see immediately on a student's profile, never mixed
-- into the daily observation timeline and never printed in any report.
create table if not exists student_notes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students (id) on delete cascade,
  category    text not null default 'other' check (category in ('allergy', 'plan', 'special_needs', 'description', 'other')),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists domains (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text not null default '⭐',
  color       text not null default '#A7D8F0',
  sort_order  integer not null default 0,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Units/lessons are scoped to a domain (Math's "Unit 2" is a different thing
-- from Reading's "Unit 2") and managed the same way domains are: a small,
-- teacher-editable list rather than freeform text, so notes can be filtered
-- and reports grouped consistently.
create table if not exists units (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid not null references domains (id) on delete cascade,
  label       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists observations (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students (id) on delete cascade,
  school_year_id uuid not null references school_years (id) on delete cascade,
  body           text not null,
  level          text check (level in ('emerging', 'developing', 'secure')),
  unit_id        uuid references units (id) on delete set null,
  observed_on    date not null default current_date,
  is_flagged     boolean not null default false,
  photo_url      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists observation_domains (
  observation_id uuid not null references observations (id) on delete cascade,
  domain_id      uuid not null references domains (id) on delete cascade,
  primary key (observation_id, domain_id)
);

create table if not exists summaries (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students (id) on delete cascade,
  school_year_id uuid not null references school_years (id) on delete cascade,
  term           text not null check (term in ('fall', 'winter', 'spring')),
  body           text not null default '',
  updated_at     timestamptz not null default now(),
  unique (student_id, term)
);

-- Teacher's own reflections — ideas, what went well, what to change, routine
-- tweaks. Not tied to any student, never printed in a report. Just for her.
create table if not exists teacher_notes (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references school_years (id) on delete cascade,
  category       text not null default 'idea' check (category in ('idea', 'went_well', 'to_improve', 'routine')),
  body           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_students_school_year on students (school_year_id);
create index if not exists idx_teacher_notes_school_year on teacher_notes (school_year_id);
create index if not exists idx_student_notes_student on student_notes (student_id);
create index if not exists idx_units_domain on units (domain_id);
create index if not exists idx_observations_student on observations (student_id);
create index if not exists idx_observations_school_year on observations (school_year_id);
create index if not exists idx_observations_observed_on on observations (observed_on);
create index if not exists idx_summaries_student on summaries (student_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_observations_updated_at on observations;
create trigger trg_observations_updated_at
  before update on observations
  for each row execute function set_updated_at();

drop trigger if exists trg_summaries_updated_at on summaries;
create trigger trg_summaries_updated_at
  before update on summaries
  for each row execute function set_updated_at();

drop trigger if exists trg_student_notes_updated_at on student_notes;
create trigger trg_student_notes_updated_at
  before update on student_notes
  for each row execute function set_updated_at();

drop trigger if exists trg_teacher_notes_updated_at on teacher_notes;
create trigger trg_teacher_notes_updated_at
  before update on teacher_notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Exactly two accounts, both provisioned by hand in the dashboard. Access is
-- gated on "is this auth user present in profiles" — a leaked URL alone
-- exposes nothing, since anon/unauthenticated requests are never a member
-- of profiles. Destructive admin actions (deleting a school year, hard-
-- deleting a student) are further restricted to role = 'admin'.

create or replace function is_authorized()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

alter table school_years enable row level security;
alter table profiles enable row level security;
alter table students enable row level security;
alter table domains enable row level security;
alter table observations enable row level security;
alter table observation_domains enable row level security;
alter table summaries enable row level security;
alter table student_notes enable row level security;
alter table units enable row level security;
alter table teacher_notes enable row level security;

-- profiles: a user can read the two profile rows, but only edit their own.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (is_authorized());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- school_years: any authorized user reads/creates; only admin edits/deletes.
drop policy if exists "school_years_select" on school_years;
create policy "school_years_select" on school_years for select
  using (is_authorized());

drop policy if exists "school_years_insert" on school_years;
create policy "school_years_insert" on school_years for insert
  with check (is_authorized());

drop policy if exists "school_years_update" on school_years;
create policy "school_years_update" on school_years for update
  using (is_admin()) with check (is_admin());

drop policy if exists "school_years_delete" on school_years;
create policy "school_years_delete" on school_years for delete
  using (is_admin());

-- students: any authorized user reads/creates/edits; hard delete is admin-only
-- (the teacher archives instead, via status = 'archived').
drop policy if exists "students_select" on students;
create policy "students_select" on students for select
  using (is_authorized());

drop policy if exists "students_insert" on students;
create policy "students_insert" on students for insert
  with check (is_authorized());

drop policy if exists "students_update" on students;
create policy "students_update" on students for update
  using (is_authorized()) with check (is_authorized());

drop policy if exists "students_delete" on students;
create policy "students_delete" on students for delete
  using (is_admin());

-- domains: fully editable by any authorized user (teacher owns her taxonomy).
drop policy if exists "domains_select" on domains;
create policy "domains_select" on domains for select
  using (is_authorized());

drop policy if exists "domains_all" on domains;
create policy "domains_insert" on domains for insert
  with check (is_authorized());
create policy "domains_update" on domains for update
  using (is_authorized()) with check (is_authorized());
create policy "domains_delete" on domains for delete
  using (is_authorized());

-- observations: full CRUD for any authorized user.
drop policy if exists "observations_select" on observations;
create policy "observations_select" on observations for select
  using (is_authorized());

drop policy if exists "observations_insert" on observations;
create policy "observations_insert" on observations for insert
  with check (is_authorized());

drop policy if exists "observations_update" on observations;
create policy "observations_update" on observations for update
  using (is_authorized()) with check (is_authorized());

drop policy if exists "observations_delete" on observations;
create policy "observations_delete" on observations for delete
  using (is_authorized());

-- observation_domains: full CRUD for any authorized user.
drop policy if exists "observation_domains_select" on observation_domains;
create policy "observation_domains_select" on observation_domains for select
  using (is_authorized());

drop policy if exists "observation_domains_insert" on observation_domains;
create policy "observation_domains_insert" on observation_domains for insert
  with check (is_authorized());

drop policy if exists "observation_domains_delete" on observation_domains;
create policy "observation_domains_delete" on observation_domains for delete
  using (is_authorized());

-- summaries: full CRUD for any authorized user.
drop policy if exists "summaries_select" on summaries;
create policy "summaries_select" on summaries for select
  using (is_authorized());

drop policy if exists "summaries_insert" on summaries;
create policy "summaries_insert" on summaries for insert
  with check (is_authorized());

drop policy if exists "summaries_update" on summaries;
create policy "summaries_update" on summaries for update
  using (is_authorized()) with check (is_authorized());

drop policy if exists "summaries_delete" on summaries;
create policy "summaries_delete" on summaries for delete
  using (is_authorized());

-- student_notes: full CRUD for any authorized user. Never surfaced in reports.
drop policy if exists "student_notes_select" on student_notes;
create policy "student_notes_select" on student_notes for select
  using (is_authorized());

drop policy if exists "student_notes_insert" on student_notes;
create policy "student_notes_insert" on student_notes for insert
  with check (is_authorized());

drop policy if exists "student_notes_update" on student_notes;
create policy "student_notes_update" on student_notes for update
  using (is_authorized()) with check (is_authorized());

drop policy if exists "student_notes_delete" on student_notes;
create policy "student_notes_delete" on student_notes for delete
  using (is_authorized());

-- units: fully editable by any authorized user, same as domains.
drop policy if exists "units_select" on units;
create policy "units_select" on units for select
  using (is_authorized());

drop policy if exists "units_insert" on units;
create policy "units_insert" on units for insert
  with check (is_authorized());

drop policy if exists "units_update" on units;
create policy "units_update" on units for update
  using (is_authorized()) with check (is_authorized());

drop policy if exists "units_delete" on units;
create policy "units_delete" on units for delete
  using (is_authorized());

-- teacher_notes: full CRUD for any authorized user. Never surfaced in reports.
drop policy if exists "teacher_notes_select" on teacher_notes;
create policy "teacher_notes_select" on teacher_notes for select
  using (is_authorized());

drop policy if exists "teacher_notes_insert" on teacher_notes;
create policy "teacher_notes_insert" on teacher_notes for insert
  with check (is_authorized());

drop policy if exists "teacher_notes_update" on teacher_notes;
create policy "teacher_notes_update" on teacher_notes for update
  using (is_authorized()) with check (is_authorized());

drop policy if exists "teacher_notes_delete" on teacher_notes;
create policy "teacher_notes_delete" on teacher_notes for delete
  using (is_authorized());

-- ---------------------------------------------------------------------------
-- Seed: default domains + a starter school year
-- Edit the dates/label below before running, or adjust later in-app.
-- ---------------------------------------------------------------------------

insert into school_years (label, start_date, end_date, is_current)
values ('2026–2027', '2026-08-15', '2027-06-15', true)
on conflict do nothing;

insert into domains (name, icon, color, sort_order)
values
  ('Literacy & Language', '📖', '#C8A2E8', 1),
  ('Math & Numbers', '🔢', '#A7D8F0', 2),
  ('Social & Emotional', '💛', '#FFF6A9', 3),
  ('Fine Motor', '✂️', '#C8A2E8', 4),
  ('Gross Motor', '🏃', '#A7D8F0', 5),
  ('Creative Expression', '🎨', '#FFF6A9', 6),
  ('Approaches to Learning', '🔎', '#C8A2E8', 7)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- After running this file:
--   1. Authentication -> Providers -> Email -> turn OFF "Allow new users to sign up".
--   2. Authentication -> Users -> Invite user, for yourself (role admin) and the
--      teacher (role teacher). After each accepts the invite, insert their
--      profile row, e.g.:
--        insert into profiles (id, email, display_name, role)
--        values ('<auth-user-uuid>', 'you@example.com', 'You', 'admin');
-- ---------------------------------------------------------------------------
