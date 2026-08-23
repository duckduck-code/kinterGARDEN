-- Migration 005 — run this once in the Supabase SQL editor.
-- Adds an optional "class name" to school_years (e.g. "Ms. Madisen's Class")
-- shown throughout the app instead of the bare year label where it fits.

alter table school_years add column if not exists class_name text;
