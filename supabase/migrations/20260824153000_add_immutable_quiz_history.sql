-- Keep student quiz results permanently available as a read-only history.

drop policy if exists quiz_results_delete on public.quiz_results;
revoke delete on table public.quiz_results from anon, authenticated;

create or replace function public.get_quiz_attempt_history_for_student()
returns table (
  id uuid,
  quiz_id uuid,
  quiz_title text,
  course_title text,
  lesson_title text,
  score integer,
  total_marks integer,
  passed boolean,
  answers jsonb,
  taken_at timestamptz
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
    qr.id,
    qr.quiz_id,
    q.title,
    c.title,
    l.title,
    qr.score,
    qr.total_marks,
    qr.passed,
    coalesce(qr.answers, '{}'::jsonb),
    qr.taken_at
  from public.quiz_results qr
  join public.quizzes q on q.id = qr.quiz_id
  join public.courses c on c.id = q.course_id
  left join public.lessons l on l.id = q.lesson_id
  where qr.student_id = v_user_id
  order by qr.taken_at desc, qr.id desc;
end;
$$;

revoke all on function public.get_quiz_attempt_history_for_student()
  from public, anon;
grant execute on function public.get_quiz_attempt_history_for_student()
  to authenticated;
