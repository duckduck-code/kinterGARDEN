-- Migration 002 — run this once in the Supabase SQL editor on your existing
-- project. Adds: an optional "unit/lesson" tag on observations, and a pinned
-- notes table for allergies/plans/special needs/description that stays off
-- the daily timeline and out of every printed report.
--
-- Safe to run even if you already applied the latest schema.sql from
-- scratch — every statement below is idempotent (if not exists / or replace).

alter table observations add column if not exists unit_label text;

create table if not exists student_notes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students (id) on delete cascade,
  category    text not null default 'other' check (category in ('allergy', 'plan', 'special_needs', 'description', 'other')),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_student_notes_student on student_notes (student_id);

drop trigger if exists trg_student_notes_updated_at on student_notes;
create trigger trg_student_notes_updated_at
  before update on student_notes
  for each row execute function set_updated_at();

alter table student_notes enable row level security;

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
