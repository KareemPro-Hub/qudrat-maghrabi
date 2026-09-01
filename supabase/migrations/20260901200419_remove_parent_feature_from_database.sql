-- إزالة ميزة ولي الأمر نهائيًا من قاعدة البيانات بقرار صاحب المنصة.
-- كل سياسة هنا هي نفسها بالظبط ناقص فرع parent_student فقط.

-- 1) دوال ربط ولي الأمر بالطالب
drop function if exists private.create_parent_link_code_for_current_user();
drop function if exists private.link_student_by_code_for_current_user(text);

-- 2) دالة صلاحية الوصول للكورس بدون فرع ولي الأمر
create or replace function public.has_active_course_access(p_student_id uuid, p_course_id uuid)
returns boolean
language sql
stable
set search_path to ''
as $function$
  select coalesce(
    case
      when p_student_id is null or p_course_id is null then false
      when not (
        p_student_id = auth.uid()
        or auth.role() = 'service_role'
        or coalesce(public.auth_role(), '') = any (
          array['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']
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
$function$;

-- 3) السياسات
drop policy if exists course_completions_select on public.course_completions;
create policy course_completions_select on public.course_completions
  for select
  using (
    student_id = (select auth.uid())
    or public.auth_role() = any (array['admin','teacher','content_manager','student_manager'])
  );

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select
  using (
    student_id = (select auth.uid())
    or public.auth_role() = any (array['admin','teacher','student_manager'])
  );

drop policy if exists progress_select on public.lesson_progress;
create policy progress_select on public.lesson_progress
  for select
  using (
    student_id = (select auth.uid())
    or public.auth_role() = any (array['admin','teacher'])
  );

drop policy if exists lessons_enrolled_read on public.lessons;
create policy lessons_enrolled_read on public.lessons
  for select
  to authenticated
  using (
    public.has_active_course_access((select auth.uid()), course_id)
    or public.auth_role() = any (array['admin','teacher','content_manager'])
  );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert
  with check (
    user_id = (select auth.uid())
    or public.auth_role() = any (array['admin','teacher','content_manager','student_manager'])
  );

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or public.auth_role() = any (array['admin','teacher','content_manager','student_manager'])
  );

drop policy if exists quiz_results_select on public.quiz_results;
create policy quiz_results_select on public.quiz_results
  for select
  using (
    student_id = (select auth.uid())
    or public.auth_role() = any (array['admin','teacher'])
  );

drop policy if exists quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes
  for select
  using (
    public.auth_role() = any (array['admin','teacher','quiz_manager'])
    or (
      is_published = true
      and public.has_active_course_access((select auth.uid()), quizzes.course_id)
    )
    or (
      is_published = true
      and exists (
        select 1
        from public.lessons l
        join public.courses c on c.id = l.course_id
        where l.id = quizzes.lesson_id
          and l.course_id = quizzes.course_id
          and l.is_published = true
          and l.is_free_preview = true
          and c.is_published = true
      )
    )
  );

-- 4) الجداول
drop table if exists public.parent_student;
drop table if exists private.parent_link_codes;
