-- زر «عرفني الإجابة الصحيحة» صار يظهر بعد إجابة كل سؤال أثناء الاختبار،
-- لا في نهايته فقط. لذلك تُعيد الدالة معرّف فيديو الشرح مع السؤال.
-- لم يُضَف correct_answer: الإجابة الصحيحة تبقى مخفية حتى التسليم.
-- باقي المنطق والصلاحيات كما هو حرفيًا.
drop function if exists public.get_quiz_questions_for_student(uuid);

create function public.get_quiz_questions_for_student(p_quiz_id uuid)
 returns table(
   id uuid, quiz_id uuid, question_text text,
   option_a text, option_b text, option_c text, option_d text,
   marks integer, order_index integer,
   question_image_url text, question_link_url text, question_link_text text,
   explanation_video_id text
 )
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not (
    exists (
      select 1
      from public.quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = p_quiz_id
        and q.is_published = true
        and c.is_published = true
        and public.has_active_course_access(auth.uid(), q.course_id)
    )
    or public.quiz_is_free_lesson_homework(p_quiz_id)
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
    qq.question_link_text,
    qq.explanation_video_id
  from public.quiz_questions qq
  where qq.quiz_id = p_quiz_id
  order by qq.order_index, qq.id;
end;
$function$;

revoke all on function public.get_quiz_questions_for_student(uuid) from public, anon;
grant execute on function public.get_quiz_questions_for_student(uuid) to authenticated;
