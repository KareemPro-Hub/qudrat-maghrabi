-- The access helper only reads rows already protected by RLS, so invoker
-- security is sufficient and avoids exposing an unnecessary definer RPC.

create or replace function public.has_active_course_access(
  p_student_id uuid,
  p_course_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    case
      when p_student_id is null or p_course_id is null then false
      when not (
        p_student_id = auth.uid()
        or auth.role() = 'service_role'
        or coalesce(public.auth_role(), '') = any (
          array['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']
        )
        or exists (
          select 1
          from public.parent_student ps
          where ps.parent_id = auth.uid()
            and ps.student_id = p_student_id
        )
      ) then false
      else exists (
        select 1
        from public.courses c
        where c.id = p_course_id
          and c.is_published = true
          and (
            (
              c.price = 0
              and not exists (
                select 1
                from public.courses child
                where child.parent_course_id = c.id
              )
            )
            or exists (
              select 1
              from public.enrollments e
              where e.student_id = p_student_id
                and e.payment_status = 'paid'
                and (e.expires_at is null or e.expires_at > now())
                and (
                  e.course_id = c.id
                  or e.course_id = c.parent_course_id
                )
            )
          )
      )
    end,
    false
  );
$$;

drop policy if exists lessons_enrolled_read on public.lessons;
create policy lessons_enrolled_read on public.lessons
for select to authenticated
using (
  public.has_active_course_access((select auth.uid()), lessons.course_id)
  or exists (
    select 1
    from public.parent_student ps
    where ps.parent_id = (select auth.uid())
      and public.has_active_course_access(ps.student_id, lessons.course_id)
  )
  or public.auth_role() = any (array['admin', 'teacher', 'content_manager'])
);

drop policy if exists quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes
for select to authenticated
using (
  public.auth_role() = any (array['admin', 'teacher', 'quiz_manager'])
  or (
    is_published = true
    and public.has_active_course_access((select auth.uid()), quizzes.course_id)
  )
  or (
    is_published = true
    and exists (
      select 1
      from public.parent_student ps
      where ps.parent_id = (select auth.uid())
        and public.has_active_course_access(ps.student_id, quizzes.course_id)
    )
  )
);
