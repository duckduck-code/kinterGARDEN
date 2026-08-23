-- Migration 003 — run this once in the Supabase SQL editor.
-- Upgrades "unit/lesson" from freeform text (migration_002) to a proper,
-- teacher-editable list scoped per domain — like domains themselves, so it
-- shows as a dropdown instead of retyped text, and reports/filters stay
-- consistent. Safe to run whether or not you'd already added any unit_label
-- text — that column is dropped here since nothing depended on its content.

create table if not exists units (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid not null references domains (id) on delete cascade,
  label       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_units_domain on units (domain_id);

alter table observations add column if not exists unit_id uuid references units (id) on delete set null;
alter table observations drop column if exists unit_label;

alter table units enable row level security;

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
