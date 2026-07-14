-- SIL Academy database + Storage setup
create extension if not exists pgcrypto;

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category text default '',
  icon text default '🎓',
  status text not null default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.academy_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  session_date date not null,
  session_time text not null,
  seats integer not null default 14 check (seats > 0),
  sort_order integer not null default 0
);

alter table public.academy_sessions
  add column if not exists previous_session_time text;

create table if not exists public.academy_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  type text not null default 'text',
  title text default '',
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create table if not exists public.academy_employees (
  id bigint generated always as identity primary key,
  full_name text not null unique
);

create table if not exists public.academy_bookings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  session_id uuid not null references public.academy_sessions(id) on delete cascade,
  employee_name text not null,
  seat_no integer not null,
  created_at timestamptz not null default now(),
  unique(session_id, seat_no),
  unique(session_id, employee_name)
);

drop view if exists public.academy_bookings_view;
drop view if exists public.academy_sessions_view;

create view public.academy_bookings_view as
select b.id,b.course_id,b.session_id,b.employee_name,b.seat_no,b.created_at,
       c.title as course_title,s.session_date,s.session_time
from public.academy_bookings b
join public.academy_courses c on c.id=b.course_id
join public.academy_sessions s on s.id=b.session_id;

create view public.academy_sessions_view as
select s.id,s.course_id,s.session_date,s.session_time,s.seats,s.sort_order,
       s.previous_session_time,c.title as course_title,
       greatest(s.seats-count(b.id),0)::int as free_seats
from public.academy_sessions s
join public.academy_courses c on c.id=s.course_id
left join public.academy_bookings b on b.session_id=s.id
group by s.id,s.course_id,s.session_date,s.session_time,s.seats,s.sort_order,
         s.previous_session_time,c.title;

alter table public.academy_courses enable row level security;
alter table public.academy_sessions enable row level security;
alter table public.academy_sections enable row level security;
alter table public.academy_employees enable row level security;
alter table public.academy_bookings enable row level security;

do $$ begin
  create policy academy_courses_all on public.academy_courses for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_sessions_all on public.academy_sessions for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_sections_all on public.academy_sections for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_employees_all on public.academy_employees for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_bookings_all on public.academy_bookings for all using (true) with check (true);
exception when duplicate_object then null; end $$;

grant select on public.academy_bookings_view to anon, authenticated;
grant select on public.academy_sessions_view to anon, authenticated;
grant usage, select on sequence public.academy_employees_id_seq to anon, authenticated;

insert into storage.buckets (id,name,public)
values ('academy-files','academy-files',true)
on conflict (id) do update set public=true;

do $$ begin
  create policy academy_files_read on storage.objects for select using (bucket_id='academy-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_files_insert on storage.objects for insert with check (bucket_id='academy-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_files_update on storage.objects for update using (bucket_id='academy-files') with check (bucket_id='academy-files');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_files_delete on storage.objects for delete using (bucket_id='academy-files');
exception when duplicate_object then null; end $$;

-- Optional starter course
insert into public.academy_courses (id,title,description,category,icon,status)
values ('11111111-1111-4111-8111-111111111111','SUMMIT SAFE & TRAVEL','Դժբախտ դեպքերից և ճանապարհորդության ապահովագրության դասընթաց','Ապահովագրական պրոդուկտներ','🛡️✈️','active')
on conflict (id) do nothing;


-- V2: reusable speakers and course-speaker assignments
create table if not exists public.academy_speakers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text default '',
  company text default 'SIL Insurance',
  bio text default '',
  photo_url text default '',
  photo_path text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_course_speakers (
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  speaker_id uuid not null references public.academy_speakers(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (course_id, speaker_id)
);

alter table public.academy_speakers enable row level security;
alter table public.academy_course_speakers enable row level security;
do $$ begin
  create policy academy_speakers_all on public.academy_speakers for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy academy_course_speakers_all on public.academy_course_speakers for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Two additional starter courses
insert into public.academy_courses (id,title,description,category,icon,status)
values
('22222222-2222-4222-8222-222222222222','ԱՊՊԱ և ԱՊՊԱ+','ԱՊՊԱ և ԱՊՊԱ+ ապահովագրական պրոդուկտների դասընթաց','Ապահովագրական պրոդուկտներ','🚗','active'),
('33333333-3333-4333-8333-333333333333','CASCO & SAFE DRIVE','ԿԱՍԿՈ և SAFE DRIVE ապահովագրական պրոդուկտների դասընթաց','Ապահովագրական պրոդուկտներ','🚘','active')
on conflict (id) do update set title=excluded.title,description=excluded.description,category=excluded.category,icon=excluded.icon,status=excluded.status;
