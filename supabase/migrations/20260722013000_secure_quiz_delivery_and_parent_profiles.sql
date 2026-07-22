-- Keep answer keys on the server and allow linked parents to view only their children.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  (select auth.uid()) = id
  or exists (
    select 1
    from public.parent_student ps
    where ps.parent_id = (select auth.uid())
      and ps.student_id = profiles.id
  )
  or public.auth_role() = any (array['admin', 'teacher', 'content_manager', 'student_manager'])
);

drop policy if exists quiz_questions_select on public.quiz_questions;
create policy quiz_questions_select on public.quiz_questions
for select to authenticated
using (public.auth_role() = any (array['admin', 'teacher', 'quiz_manager']));

drop policy if exists quiz_results_insert on public.quiz_results;
create policy quiz_results_insert on public.quiz_results
for insert to authenticated
with check (public.auth_role() = any (array['admin', 'teacher', 'quiz_manager']));

drop policy if exists quiz_results_update on public.quiz_results;
create policy quiz_results_update on public.quiz_results
for update to authenticated
using (public.auth_role() = any (array['admin', 'teacher', 'quiz_manager']))
with check (public.auth_role() = any (array['admin', 'teacher', 'quiz_manager']));

create or replace function public.get_quiz_questions_for_student(p_quiz_id uuid)
returns table (
  id uuid,
  quiz_id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  marks integer,
  order_index integer,
  question_image_url text,
  question_link_url text,
  question_link_text text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.quizzes q
    join public.enrollments e
      on e.course_id = q.course_id
     and e.student_id = auth.uid()
     and e.payment_status = 'paid'
    where q.id = p_quiz_id
      and q.is_published = true
  ) and coalesce(public.auth_role(), '') not in ('admin', 'teacher', 'quiz_manager') then
    raise exception 'quiz is not available for this account' using errcode = '42501';
  end if;

  return query
  select qq.id, qq.quiz_id, qq.question_text,
         qq.option_a, qq.option_b, qq.option_c, qq.option_d,
         coalesce(qq.marks, 1), coalesce(qq.order_index, 0),
         qq.question_image_url, qq.question_link_url, qq.question_link_text
  from public.quiz_questions qq
  where qq.quiz_id = p_quiz_id
  order by qq.order_index, qq.id;
end;
$$;

create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns setof public.quiz_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_pass_marks integer;
  v_total_marks integer;
  v_score integer;
  v_result_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select coalesce(q.pass_marks, 0), coalesce(q.total_marks, 0)
    into v_pass_marks, v_total_marks
  from public.quizzes q
  where q.id = p_quiz_id
    and q.is_published = true
    and exists (
      select 1 from public.enrollments e
      where e.student_id = v_user_id
        and e.course_id = q.course_id
        and e.payment_status = 'paid'
    );

  if not found then
    raise exception 'quiz is not available for this account' using errcode = '42501';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object' using errcode = '22023';
  end if;

  if exists (select 1 from jsonb_each_text(p_answers) a where a.value not in ('a', 'b', 'c', 'd')) then
    raise exception 'invalid answer value' using errcode = '22023';
  end if;

  select coalesce(sum(coalesce(qq.marks, 1)), 0)
    into v_score
  from public.quiz_questions qq
  where qq.quiz_id = p_quiz_id
    and p_answers ->> qq.id::text = qq.correct_answer;

  insert into public.quiz_results (student_id, quiz_id, score, total_marks, passed, answers)
  values (v_user_id, p_quiz_id, v_score, v_total_marks, v_score >= v_pass_marks, p_answers)
  returning id into v_result_id;

  return query select qr.* from public.quiz_results qr where qr.id = v_result_id;
end;
$$;

create or replace function public.get_quiz_review(p_quiz_id uuid, p_result_id uuid)
returns table (
  id uuid,
  quiz_id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text,
  marks integer,
  order_index integer,
  explanation text,
  explanation_video_id text,
  question_image_url text,
  question_link_url text,
  question_link_text text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.quiz_results qr
    where qr.id = p_result_id
      and qr.quiz_id = p_quiz_id
      and qr.student_id = auth.uid()
  ) then
    raise exception 'review is not available for this account' using errcode = '42501';
  end if;

  return query
  select qq.id, qq.quiz_id, qq.question_text,
         qq.option_a, qq.option_b, qq.option_c, qq.option_d,
         qq.correct_answer, coalesce(qq.marks, 1), coalesce(qq.order_index, 0),
         qq.explanation, qq.explanation_video_id,
         qq.question_image_url, qq.question_link_url, qq.question_link_text
  from public.quiz_questions qq
  where qq.quiz_id = p_quiz_id
  order by qq.order_index, qq.id;
end;
$$;

revoke all on function public.get_quiz_questions_for_student(uuid) from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
revoke all on function public.get_quiz_review(uuid, uuid) from public, anon;
grant execute on function public.get_quiz_questions_for_student(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
grant execute on function public.get_quiz_review(uuid, uuid) to authenticated;
