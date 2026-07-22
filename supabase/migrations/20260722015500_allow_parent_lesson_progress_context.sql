-- Parents need lesson metadata to calculate progress for their linked students.

drop policy if exists lessons_enrolled_read on public.lessons;
create policy lessons_enrolled_read on public.lessons
for select to authenticated
using (
  is_free_preview = true
  or exists (
    select 1 from public.courses c
    where c.id = lessons.course_id
      and c.price = 0
      and c.is_published = true
      and not exists (select 1 from public.courses sub where sub.parent_course_id = c.id)
  )
  or exists (
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
