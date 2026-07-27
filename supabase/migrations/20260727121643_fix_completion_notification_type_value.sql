-- جدول notifications يقيّد عمود type بقيم محددة، وتطبيق الجوال يعتمد على نفس القيم.
-- لذلك نستخدم 'success' بدل قيم جديدة، ولا نمسّ القيد إطلاقًا.
create or replace function public.notify_lesson_completed()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_course_id uuid;
  v_course_title text;
  v_total int;
  v_done int;
  v_inserted uuid;
begin
  if new.completed is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.completed is true then
    return new;
  end if;

  begin
    select l.course_id into v_course_id from public.lessons l where l.id = new.lesson_id;
    if v_course_id is null then
      return new;
    end if;

    insert into public.notifications (user_id, title, body, type)
    values (
      new.student_id,
      'قربت 🎓',
      'لم يتبقَّ الكثير. تخيّل شعورك يوم النتيجة.',
      'success'
    );

    select count(*) into v_total
    from public.lessons l
    where l.course_id = v_course_id and coalesce(l.is_published, true);

    select count(*) into v_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where l.course_id = v_course_id
      and coalesce(l.is_published, true)
      and lp.student_id = new.student_id
      and lp.completed is true;

    if v_total > 0 and v_done >= v_total then
      insert into public.course_completions (student_id, course_id)
      values (new.student_id, v_course_id)
      on conflict (student_id, course_id) do nothing
      returning id into v_inserted;

      if v_inserted is not null then
        select c.title into v_course_title from public.courses c where c.id = v_course_id;

        insert into public.notifications (user_id, title, body, type)
        values (
          new.student_id,
          'أنهيت الكورس 🎓',
          'أنهيت «' || coalesce(v_course_title, 'الكورس') || '» كاملًا. ما تعلمته صار مهارة — ثبّتها بالمراجعة.',
          'success'
        );
      end if;
    end if;
  exception when others then
    return new;
  end;

  return new;
end;
$$;

revoke execute on function public.notify_lesson_completed() from public;
revoke execute on function public.notify_lesson_completed() from anon;
revoke execute on function public.notify_lesson_completed() from authenticated;
