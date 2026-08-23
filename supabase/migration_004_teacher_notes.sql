-- Migration 004 — run this once in the Supabase SQL editor.
-- Adds a "teacher notes" table: personal reflections (ideas, what went
-- well, what to change, routine tweaks) scoped to the school year, not to
-- any student. Never printed in a report.

create table if not exists teacher_notes (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references school_years (id) on delete cascade,
  category       text not null default 'idea' check (category in ('idea', 'went_well', 'to_improve', 'routine')),
  body           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_teacher_notes_school_year on teacher_notes (school_year_id);

drop trigger if exists trg_teacher_notes_updated_at on teacher_notes;
create trigger trg_teacher_notes_updated_at
  before update on teacher_notes
  for each row execute function set_updated_at();

alter table teacher_notes enable row level security;

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
