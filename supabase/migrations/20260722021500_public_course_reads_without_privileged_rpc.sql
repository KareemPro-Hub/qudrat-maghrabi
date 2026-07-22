-- Public catalogue reads must not require executing a privileged role helper.

drop policy if exists courses_select on public.courses;
drop policy if exists courses_public_select on public.courses;
drop policy if exists courses_staff_select on public.courses;
create policy courses_public_select on public.courses
for select to anon, authenticated
using (is_published = true);
create policy courses_staff_select on public.courses
for select to authenticated
using (public.auth_role() = any (array['admin', 'teacher', 'content_manager']));

drop policy if exists chapters_select on public.chapters;
drop policy if exists chapters_public_select on public.chapters;
drop policy if exists chapters_staff_select on public.chapters;
create policy chapters_public_select on public.chapters
for select to anon, authenticated
using (exists (
  select 1 from public.courses c
  where c.id = chapters.course_id and c.is_published = true
));
create policy chapters_staff_select on public.chapters
for select to authenticated
using (public.auth_role() = any (array['admin', 'teacher', 'content_manager']));

drop policy if exists lessons_enrolled_read on public.lessons;
drop policy if exists lessons_public_read on public.lessons;
create policy lessons_public_read on public.lessons
for select to anon, authenticated
using (
  is_free_preview = true
  or exists (
    select 1 from public.courses c
    where c.id = lessons.course_id
      and c.price = 0
      and c.is_published = true
      and not exists (select 1 from public.courses sub where sub.parent_course_id = c.id)
  )
);
create policy lessons_enrolled_read on public.lessons
for select to authenticated
using (
  exists (
    select 1 from public.enrollments e
    where e.student_id = (select auth.uid())
      and e.course_id = lessons.course_id
      and e.payment_status = 'paid'
  )
  or exists (
    select 1
    from public.enrollments e
    join public.parent_student ps on ps.student_id = e.student_id
    where ps.parent_id = (select auth.uid())
      and e.course_id = lessons.course_id
      and e.payment_status = 'paid'
  )
  or public.auth_role() = any (array['admin', 'teacher', 'content_manager'])
);

create table if not exists public.course_public_stats (
  course_id uuid primary key references public.courses(id) on delete cascade,
  lessons_count integer not null default 0 check (lessons_count >= 0),
  enrolled_count integer not null default 0 check (enrolled_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.course_public_stats enable row level security;
drop policy if exists course_public_stats_read on public.course_public_stats;
create policy course_public_stats_read on public.course_public_stats
for select to anon, authenticated
using (exists (
  select 1 from public.courses c
  where c.id = course_public_stats.course_id and c.is_published = true
));
grant select on table public.course_public_stats to anon, authenticated;

create or replace function public.refresh_course_public_stats(p_course_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.course_public_stats (course_id, lessons_count, enrolled_count, updated_at)
  select c.id,
         (select count(*)::integer from public.lessons l where l.course_id = c.id and l.is_published = true),
         (select count(distinct e.student_id)::integer from public.enrollments e where e.course_id = c.id and e.payment_status = 'paid'),
         now()
  from public.courses c
  where c.id = p_course_id
  on conflict (course_id) do update
  set lessons_count = excluded.lessons_count,
      enrolled_count = excluded.enrolled_count,
      updated_at = excluded.updated_at;
$$;
revoke all on function public.refresh_course_public_stats(uuid) from public, anon, authenticated;
grant execute on function public.refresh_course_public_stats(uuid) to service_role;

create or replace function public.sync_course_public_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_course_public_stats(old.course_id);
  elsif tg_op = 'INSERT' then
    perform public.refresh_course_public_stats(new.course_id);
  else
    if old.course_id is distinct from new.course_id then
      perform public.refresh_course_public_stats(old.course_id);
    end if;
    perform public.refresh_course_public_stats(new.course_id);
  end if;
  return null;
end;
$$;
revoke all on function public.sync_course_public_stats() from public, anon, authenticated;

drop trigger if exists sync_course_stats_from_lessons on public.lessons;
create trigger sync_course_stats_from_lessons
after insert or update or delete on public.lessons
for each row execute function public.sync_course_public_stats();

drop trigger if exists sync_course_stats_from_enrollments on public.enrollments;
create trigger sync_course_stats_from_enrollments
after insert or update or delete on public.enrollments
for each row execute function public.sync_course_public_stats();

insert into public.course_public_stats (course_id, lessons_count, enrolled_count, updated_at)
select c.id,
       (select count(*)::integer from public.lessons l where l.course_id = c.id and l.is_published = true),
       (select count(distinct e.student_id)::integer from public.enrollments e where e.course_id = c.id and e.payment_status = 'paid'),
       now()
from public.courses c
on conflict (course_id) do update
set lessons_count = excluded.lessons_count,
    enrolled_count = excluded.enrolled_count,
    updated_at = excluded.updated_at;
