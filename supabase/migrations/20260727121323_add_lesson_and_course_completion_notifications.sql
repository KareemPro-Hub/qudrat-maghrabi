-- إشعارات تحفيزية بعد كل درس، وتسجيل إتمام الكورس (لإرسال إيميل للطالب وولي أمره).
-- إضافي بالكامل: لا يعدّل أي جدول أو عمود أو دالة قائمة، ولا يؤثر على تطبيق الجوال.

create table if not exists public.course_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  emails_sent_at timestamptz,
  constraint course_completions_student_course_key unique (student_id, course_id)
);

create index if not exists course_completions_student_idx on public.course_completions (student_id);
create index if not exists course_completions_pending_idx on public.course_completions (student_id, course_id) where emails_sent_at is null;

alter table public.course_completions enable row level security;

-- قراءة فقط: الطالب نفسه، وليّ أمره المرتبط، وفريق العمل. لا كتابة من العميل إطلاقًا.
drop policy if exists course_completions_select on public.course_completions;
create policy course_completions_select on public.course_completions
  for select using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.parent_student ps
      where ps.student_id = course_completions.student_id
        and ps.parent_id = (select auth.uid())
    )
    or public.auth_role() = any (array['admin','teacher','content_manager','student_manager'])
  );

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
  -- لا نتحرك إلا عند تحوّل الدرس إلى «مكتمل» لأول مرة
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
      'lesson_completed'
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
          'course_completed'
        );
      end if;
    end if;
  exception when others then
    -- الإشعار لا يجوز أن يعطّل تسجيل تقدّم الطالب مهما حدث
    return new;
  end;

  return new;
end;
$$;

drop trigger if exists on_lesson_completed on public.lesson_progress;
create trigger on_lesson_completed
  after insert or update on public.lesson_progress
  for each row execute function public.notify_lesson_completed();
