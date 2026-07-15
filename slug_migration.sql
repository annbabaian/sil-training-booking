alter table public.academy_courses add column if not exists slug text;

update public.academy_courses
set slug = case
  when title ilike '%SUMMIT SAFE%' then 'summit-safe-travel'
  when title ilike '%ԱՊՊԱ%' and title ilike '%ԿԱՍԿՈ%' then 'appa-casco'
  when title ilike '%ԱՊՊԱ%' then 'appa-appa-plus'
  when title ilike '%CASCO%' or title ilike '%SAFE DRIVE%' then 'casco-safe-drive'
  else 'course-' || left(id::text, 8)
end
where slug is null or btrim(slug) = '';

create unique index if not exists academy_courses_slug_key
on public.academy_courses(slug);
