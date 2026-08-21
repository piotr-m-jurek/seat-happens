# Sit Happens

A very simple multi-restaurant tablet app for managing table reservations:
a top-down floor plan, tap a table to book it, an agenda view for the day,
and a drag-and-drop editor to lay out the tables to match the real room.
Each restaurant lives at its own URL (`/r/:slug`), fully isolated from every
other restaurant in the same deployment.

- **Frontend**: React + Vite + Tailwind + shadcn/ui, in `packages/web`.
  Client state runs on `@effect/atom-react` (`packages/web/src/atoms`) —
  every Supabase repo's fetch+subscribe is bridged into an Effect `Stream`,
  so realtime subscriptions are scoped to atom lifetime automatically.
  Routing is a small hand-rolled router (`lib/router.ts`) — three route
  shapes didn't justify a library.
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth with email
  OTP + Realtime) — there is no custom server. Authorization is enforced by
  Postgres Row Level Security policies, defined in `supabase/migrations`.
- **Shared types**: `packages/shared` — the `Table`/`Reservation`/`Staff`/
  `Restaurant` types and repo interfaces that `packages/web/src/data/*Repo.ts`
  implements against Supabase. If this ever moves to a different backend,
  only that `data/` folder needs to change.

## Roles

- **Super-admin**: you (or anyone in the `super_admins` table). Creates
  restaurants and assigns each one's first owner, via `/admin`.
- **Owner**: full read/write access to their restaurant, plus the "Staff"
  tab to invite/remove viewers.
- **Viewer**: read-only. Every write action (new/edit/cancel reservations,
  the Layout tab, the Staff tab) is hidden in the UI and rejected by RLS if
  attempted directly.

One person can be staff at more than one restaurant — a `staff` row is
per (person, restaurant), and an account with several switches between
them from the header once signed in.

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

## 2. One-time: bootstrap your super-admin account

This is the only step that still needs raw SQL — everything after it is
self-service through the app itself.

1. Log in to the app once with the email that should be the super-admin.
   This creates a row in Supabase's built-in `auth.users` table (you'll land
   on "Not set up yet" — that's expected, you're not staff of a restaurant
   yet, just about to become the platform's admin).
2. In the Supabase SQL editor (or via `bunx supabase db query --linked`), run:

   ```sql
   insert into super_admins (id)
   select id from auth.users where email = 'you@example.com';
   ```
3. Reload the app and go to `/admin`. Create your first restaurant there,
   entering your own email as its owner — you'll get access the next time
   you sign in (the "Not set up yet" screen will resolve on your next login,
   or just reload). From then on, that restaurant's owner uses the **Staff**
   tab to invite viewers, and you use `/admin` to create more restaurants —
   no more manual SQL for onboarding anyone else.

## 3. Local development

```sh
bun install
cp packages/web/.env.example packages/web/.env
# edit packages/web/.env with your Supabase URL + anon key
bun run dev
```

Open the printed local URL. Logging in with no restaurant yet redirects to
"Not set up yet"; a staff member's own restaurant redirects to `/r/:slug`
automatically. Super-admins can always reach `/admin` directly.

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
