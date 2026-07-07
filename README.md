# Դասընթացի նստատեղերի ամրագրման համակարգ

Production-ready static web project for GitHub Pages + Supabase.

## Files

- `index.html` — public booking page
- `style.css` — booking page UI and CSS seat picker
- `script.js` — public booking logic + realtime
- `supabase.js` — Supabase config and shared constants
- `admin.html` — admin panel
- `admin.css` — admin UI
- `admin.js` — admin logic, edit/delete/free seat/export/filter/search
- `schema.sql` — PostgreSQL schema for Supabase

## Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `schema.sql`.
4. Go to Project Settings > API.
5. Copy:
   - Project URL
   - anon public key
6. Open `supabase.js` and replace:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_PUBLIC_KEY";
```

## Realtime setup

The schema includes:

```sql
alter publication supabase_realtime add table public.training_bookings;
```

If Supabase says the table is already added, ignore that warning.

## GitHub Pages deployment

1. Create a GitHub repository.
2. Upload all files to the repository root.
3. Go to Settings > Pages.
4. Source: Deploy from branch.
5. Branch: `main`, folder `/root`.
6. Open the generated GitHub Pages link.

## Important production note

This static demo allows admin actions using the anon key because GitHub Pages has no backend.
For real company production, protect `admin.html` with one of these:

- Supabase Auth with role-based policies
- Cloudflare Access
- company VPN
- internal-only hosting

Then update RLS policies so only admins can update/delete bookings.

## Data saved

- Անուն ազգանուն
- Բաժնի անվանում
- Դասընթացի օր
- Սեսիա
- Աթոռ
- Ամսաթիվ

## Seat conflict protection

The database has a unique constraint:

```sql
unique (training_day, session_time, seat_number)
```

So if two users try to book the same seat at the same time, only the first insert succeeds.
