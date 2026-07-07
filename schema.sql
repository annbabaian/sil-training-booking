-- =========================================================
-- Training seat booking schema for Supabase PostgreSQL
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.training_bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) >= 2),
  department text not null check (char_length(trim(department)) >= 2),
  training_day date not null,
  session_time text not null,
  seat_number integer not null check (seat_number between 1 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint training_day_allowed check (
    training_day in ('2026-07-08', '2026-07-09', '2026-07-13', '2026-07-15', '2026-07-16')
  ),
  constraint session_time_allowed check (
    session_time in ('11:00-12:00', '15:00-16:00')
  ),
  constraint unique_training_seat unique (training_day, session_time, seat_number)
);

create index if not exists idx_training_bookings_day_session
on public.training_bookings (training_day, session_time);

create index if not exists idx_training_bookings_full_name
on public.training_bookings using gin (to_tsvector('simple', full_name));

create index if not exists idx_training_bookings_department
on public.training_bookings using gin (to_tsvector('simple', department));

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_training_bookings_updated_at on public.training_bookings;
create trigger trg_training_bookings_updated_at
before update on public.training_bookings
for each row execute function public.set_updated_at();

alter table public.training_bookings enable row level security;

-- Public booking page: users can read all bookings and create a booking.
drop policy if exists "Public can read bookings" on public.training_bookings;
create policy "Public can read bookings"
on public.training_bookings for select
using (true);

drop policy if exists "Public can create bookings" on public.training_bookings;
create policy "Public can create bookings"
on public.training_bookings for insert
with check (true);

-- Admin page in this static version uses the same anon key.
-- For a real company production environment, protect admin.html behind SSO,
-- VPN, Cloudflare Access, or Supabase Auth and tighten these policies.
drop policy if exists "Public can update bookings" on public.training_bookings;
create policy "Public can update bookings"
on public.training_bookings for update
using (true)
with check (true);

drop policy if exists "Public can delete bookings" on public.training_bookings;
create policy "Public can delete bookings"
on public.training_bookings for delete
using (true);

alter publication supabase_realtime add table public.training_bookings;
