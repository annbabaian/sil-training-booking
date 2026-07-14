-- Run this once in Supabase SQL Editor.
-- It preserves all courses, sessions and bookings.

alter table public.academy_sessions
  add column if not exists previous_session_time text;

drop view if exists public.academy_bookings_view;
drop view if exists public.academy_sessions_view;

create view public.academy_bookings_view as
select
  b.id,
  b.course_id,
  b.session_id,
  b.employee_name,
  b.seat_no,
  b.created_at,
  c.title as course_title,
  s.session_date,
  s.session_time
from public.academy_bookings b
join public.academy_courses c on c.id = b.course_id
join public.academy_sessions s on s.id = b.session_id;

create view public.academy_sessions_view as
select
  s.id,
  s.course_id,
  s.session_date,
  s.session_time,
  s.seats,
  s.sort_order,
  s.previous_session_time,
  c.title as course_title,
  greatest(s.seats - count(b.id), 0)::int as free_seats
from public.academy_sessions s
join public.academy_courses c on c.id = s.course_id
left join public.academy_bookings b on b.session_id = s.id
group by
  s.id,
  s.course_id,
  s.session_date,
  s.session_time,
  s.seats,
  s.sort_order,
  s.previous_session_time,
  c.title;

grant select on public.academy_bookings_view to anon, authenticated;
grant select on public.academy_sessions_view to anon, authenticated;
