# Sit Happens

A very simple tablet app for a small restaurant to manage table reservations:
a top-down floor plan, tap a table to book it, an agenda view for the day,
and a drag-and-drop editor to lay out the tables to match the real room.

- **Frontend**: React + Vite + Tailwind + shadcn/ui, in `packages/web`
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth with email
  OTP + Realtime) — there is no custom server. Authorization is enforced by
  Postgres Row Level Security policies, defined in `supabase/migrations`.
- **Shared types**: `packages/shared` — the `Table`/`Reservation`/`Staff`
  types and repo interfaces (`AuthRepo`, `TablesRepo`, `ReservationsRepo`)
  that `packages/web/src/data/*Repo.ts` implements against Supabase. If this
  ever moves to a different backend (or adds phone/SMS OTP alongside email),
  only that `data/` folder needs to change.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Email OTP is enabled by default and works with Supabase's built-in email
   sending — no provider account needed to start. One dashboard step is
   still required: **Authentication → Emails → Magic Link** template, add
   `{{ .Token }}` somewhere in the body. Without this the email only contains
   a magic link, not the 6-digit code the app's "enter code" screen expects.
   (Phone/SMS OTP is supported too, but needs a paid SMS provider like Twilio
   configured under **Authentication → Providers → Phone** — swap to it later
   by editing `packages/web/src/data/authRepo.ts` if you want it instead of,
   or alongside, email.)
3. Run the migrations in `supabase/migrations/` against the project (via the
   SQL editor in the Supabase dashboard, or the Supabase CLI: `bunx supabase
   login`, `bunx supabase link --project-ref <ref>`, `bunx supabase db push`).
4. Grab the project's **URL** and **anon public key** from
   **Settings → API**.

## 2. One-time: add yourself to `staff`

The `staff` table controls who can log in and use the app. There's no admin
UI for this in v1 — it's one manual step:

1. Log in to the app once with the email that should have access. This
   creates a row in Supabase's built-in `auth.users` table.
2. In the Supabase SQL editor (or via `bunx supabase db query --linked`), run:

   ```sql
   insert into staff (id, email, role)
   select id, email, 'owner'
   from auth.users
   where email = 'you@example.com';
   ```

Repeat for any additional staff emails later — this is also where the system
grows into real multi-staff RBAC: add more rows, and use `role` for each
person's `('owner' | 'staff' | 'viewer')` access.

## 3. Local development

```sh
bun install
cp packages/web/.env.example packages/web/.env
# edit packages/web/.env with your Supabase URL + anon key
bun run dev
```

Open the printed local URL. Log in with a staff email (step 2), or before
that's set up you'll see a "Not set up yet" message after verifying the OTP.

## 4. Deploy

- **Frontend (Vercel)**: import this repo, set the project root to
  `packages/web`, framework preset "Vite". Add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project
  settings.
- **Backend**: nothing to deploy — it's the same hosted Supabase project used
  in local dev.

## Project layout

```
packages/
  web/      React + Vite app (this is what gets deployed to Vercel)
  shared/   TS types + repo interfaces shared with (future) other packages
supabase/
  migrations/   SQL schema + RLS policies
```
