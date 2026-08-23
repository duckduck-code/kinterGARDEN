# kinterGARDEN

A private web app for one kindergarten teacher to record short observation notes about her students and print a clean end-of-year growth report for each child. See [docs/requirements.md](docs/requirements.md) for the full spec.

## Stack

React + Vite, Supabase (Postgres + Auth), no backend server. Hosting target: Vercel (free) + Supabase (free).

## First-time setup

### 1. Install dependencies

```
npm install
```

### 2. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) once. It creates the tables, enables Row Level Security, and seeds the default domains and a starter school year (edit the label/dates in the file first, or fix them later in Settings).
3. Go to **Authentication → Providers → Email** and turn **off** "Allow new users to sign up." This app never has public signup — only the two invited accounts.
4. Go to **Authentication → Users → Invite user** and invite yourself and the teacher by email.
5. After each person accepts their invite, copy their user UUID from the Users list and insert a matching row in `profiles`:

   ```sql
   insert into profiles (id, email, display_name, role)
   values ('<their-auth-user-uuid>', 'them@example.com', 'Their Name', 'admin'); -- or 'teacher'
   ```

   Without a `profiles` row, RLS blocks all access — signing in alone isn't enough, by design (see `docs/requirements.md` R2.5).

### 3. Configure environment variables

```
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API** in the Supabase dashboard.

### 4. Run it

```
npm run dev
```

## Deploying

- **Vercel**: import the repo, add the two `VITE_SUPABASE_*` env vars in Project Settings, deploy. Framework preset: Vite.
- **Keepalive**: Supabase free projects pause after 7 days idle. [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) pings the database twice a week to prevent this. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository secrets (Settings → Secrets and variables → Actions) for it to work.

## Project structure

```
src/
  components/   shared UI (student cards, note composer, growth strip, butterfly motifs)
  screens/      one file per route
  lib/          supabase client, auth context, data-access functions, CSV export
  styles/       design tokens, global styles, print stylesheet
supabase/
  schema.sql    tables, RLS policies, seed data
```
