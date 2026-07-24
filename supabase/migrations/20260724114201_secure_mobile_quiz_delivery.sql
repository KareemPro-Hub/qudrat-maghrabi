-- Secure mobile quiz catalogue, delivery, submission and review.
-- Answer keys remain server-side and are returned only after a student's result exists.

drop policy if exists quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes
for select to authenticated
using (
  public.auth_role() = any (array['admin', 'teacher', 'quiz_manager'])
  or (
    is_published = true
    and exists (
      select 1
      from public.courses c
      where c.id = quizzes.course_id
        and c.is_published = true
        and (
          c.price = 0
          or exists (
            select 1
            from public.enrollments e
            where e.course_id = c.id
              and e.student_id = (select auth.uid())
              and e.payment_status = 'paid'
              and (e.expires_at is null or e.expires_at > now())
          )
          or exists (
            select 1
            from public.enrollments e
            join public.parent_student ps on ps.student_id = e.student_id
            where ps.parent_id = (select auth.uid())
              and e.course_id = c.id
              and e.payment_status = 'paid'
              and (e.expires_at is null or e.expires_at > now())
          )
        )
    )
  )
);

create or replace function public.get_available_quizzes_for_student()
returns table (
  id uuid,
  title text,
  description text,
  course_id uuid,
  course_title text,
  lesson_id uuid,
  lesson_title text,
  time_limit_minutes integer,
  total_marks integer,
  pass_marks integer,
  question_count bigint,
  attempt_count bigint,
  best_percentage integer,
  last_result_id uuid,
  last_score integer,
  last_total_marks integer,
  last_passed boolean,
  last_taken_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if coalesce(public.auth_role(), '') <> 'student' then
    raise exception 'student account required' using errcode = '42501';
  end if;

  return query
  select
    q.id,
    q.title,
    coalesce(q.description, ''),
    q.course_id,
    c.title,
    q.lesson_id,
    l.title,
    q.time_limit_minutes,
    coalesce(q.total_marks, 0),
    coalesce(q.pass_marks, 0),
    coalesce(question_stats.question_count, 0),
    coalesce(result_stats.attempt_count, 0),
    result_stats.best_percentage,
    latest_result.id,
    latest_result.score,
    latest_result.total_marks,
    latest_result.passed,
    latest_result.taken_at
  from public.quizzes q
  join public.courses c on c.id = q.course_id
  left join public.lessons l on l.id = q.lesson_id
  left join lateral (
    select count(*)::bigint as question_count
    from public.quiz_questions qq
    where qq.quiz_id = q.id
  ) question_stats on true
  left join lateral (
    select
      count(*)::bigint as attempt_count,
      max(
        case
          when qr.total_marks > 0
            then round((qr.score::numeric / qr.total_marks::numeric) * 100)::integer
          else 0
        end
      )::integer as best_percentage
    from public.quiz_results qr
    where qr.quiz_id = q.id
      and qr.student_id = v_user_id
  ) result_stats on true
  left join lateral (
    select qr.id, qr.score, qr.total_marks, qr.passed, qr.taken_at
    from public.quiz_results qr
    where qr.quiz_id = q.id
      and qr.student_id = v_user_id
    order by qr.taken_at desc, qr.id desc
    limit 1
  ) latest_result on true
  where q.is_published = true
    and c.is_published = true
    and (
      c.price = 0
      or exists (
        select 1
        from public.enrollments e
        where e.student_id = v_user_id
          and e.course_id = q.course_id
          and e.payment_status = 'paid'
          and (e.expires_at is null or e.expires_at > now())
      )
    )
  order by c.created_at, q.created_at, q.id;
end;
$$;

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
    join public.courses c on c.id = q.course_id
    where q.id = p_quiz_id
      and q.is_published = true
      and c.is_published = true
      and (
        c.price = 0
        or exists (
          select 1
          from public.enrollments e
          where e.course_id = q.course_id
            and e.student_id = auth.uid()
            and e.payment_status = 'paid'
            and (e.expires_at is null or e.expires_at > now())
        )
      )
  ) and coalesce(public.auth_role(), '') not in ('admin', 'teacher', 'quiz_manager') then
    raise exception 'quiz is not available for this account' using errcode = '42501';
  end if;

  return query
  select
    qq.id,
    qq.quiz_id,
    qq.question_text,
    qq.option_a,
    qq.option_b,
    qq.option_c,
    qq.option_d,
    coalesce(qq.marks, 1),
    coalesce(qq.order_index, 0),
    qq.question_image_url,
    qq.question_link_url,
    qq.question_link_text
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

  if coalesce(public.auth_role(), '') <> 'student' then
    raise exception 'student account required' using errcode = '42501';
  end if;

  select
    coalesce(q.pass_marks, 0),
    coalesce(
      (
        select sum(coalesce(qq.marks, 1))::integer
        from public.quiz_questions qq
        where qq.quiz_id = q.id
      ),
      0
    )
  into v_pass_marks, v_total_marks
  from public.quizzes q
  join public.courses c on c.id = q.course_id
  where q.id = p_quiz_id
    and q.is_published = true
    and c.is_published = true
    and (
      c.price = 0
      or exists (
        select 1
        from public.enrollments e
        where e.student_id = v_user_id
          and e.course_id = q.course_id
          and e.payment_status = 'paid'
          and (e.expires_at is null or e.expires_at > now())
      )
    );

  if not found then
    raise exception 'quiz is not available for this account' using errcode = '42501';
  end if;

  if v_total_marks <= 0 then
    raise exception 'quiz has no questions' using errcode = '22023';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each_text(p_answers) answer
    where answer.value not in ('a', 'b', 'c', 'd')
  ) then
    raise exception 'invalid answer value' using errcode = '22023';
  end if;

  select coalesce(sum(coalesce(qq.marks, 1)), 0)::integer
  into v_score
  from public.quiz_questions qq
  where qq.quiz_id = p_quiz_id
    and p_answers ->> qq.id::text = qq.correct_answer;

  insert into public.quiz_results (
    student_id,
    quiz_id,
    score,
    total_marks,
    passed,
    answers
  )
  values (
    v_user_id,
    p_quiz_id,
    v_score,
    v_total_marks,
    v_score >= v_pass_marks,
    p_answers
  )
  returning id into v_result_id;

  return query
  select qr.*
  from public.quiz_results qr
  where qr.id = v_result_id;
end;
$$;

revoke all on function public.get_available_quizzes_for_student() from public, anon;
revoke all on function public.get_quiz_questions_for_student(uuid) from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.get_available_quizzes_for_student() to authenticated;
grant execute on function public.get_quiz_questions_for_student(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
