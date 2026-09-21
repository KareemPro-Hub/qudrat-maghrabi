-- تقسيم الدرس الطويل إلى أجزاء: بدل فيديو واحد مدته ساعة، عدة أجزاء متتابعة.
-- lessons.video_id يبقى كما هو ولا يُلمس، فالدروس الحالية تعمل بلا أي تغيير؛
-- الدرس الذي له أجزاء هنا يعرضها بدلًا منه.

create table if not exists public.lesson_videos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text,
  video_id text not null,
  order_index integer not null default 0,
  duration_minutes integer,
  created_at timestamptz not null default now()
);

create index if not exists lesson_videos_lesson_order_idx
  on public.lesson_videos (lesson_id, order_index);

alter table public.lesson_videos enable row level security;

-- القراءة تتبع صلاحية الدرس نفسه بالضبط — لا توسيع ولا تضييق.
create policy "lesson_videos_select"
  on public.lesson_videos for select to authenticated, anon
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_videos.lesson_id
        and (
          l.is_free_preview = true
          or exists (
            select 1 from public.courses c
            where c.id = l.course_id
              and c.price = 0
              and c.is_published = true
              and not exists (select 1 from public.courses sub where sub.parent_course_id = c.id)
          )
          or public.has_active_course_access((select auth.uid()), l.course_id)
          or public.auth_role() = any (array['admin', 'teacher', 'content_manager', 'quiz_manager'])
        )
    )
  );

create policy "lesson_videos_write"
  on public.lesson_videos for all to authenticated
  using (public.auth_role() = any (array['admin', 'teacher', 'content_manager']))
  with check (public.auth_role() = any (array['admin', 'teacher', 'content_manager']));

-- تقدّم الطالب في كل جزء على حدة. تقدّم الدرس (lesson_progress) يبقى هو
-- المرجع النهائي للإكمال، ويُحدَّث من التطبيق عند اكتمال كل الأجزاء.
create table if not exists public.lesson_video_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_video_id uuid not null references public.lesson_videos(id) on delete cascade,
  watch_percentage integer not null default 0,
  completed boolean not null default false,
  last_position_seconds integer not null default 0,
  last_watched_at timestamptz not null default now(),
  unique (student_id, lesson_video_id)
);

create index if not exists lesson_video_progress_student_idx
  on public.lesson_video_progress (student_id);

alter table public.lesson_video_progress enable row level security;

create policy "lesson_video_progress_own"
  on public.lesson_video_progress for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy "lesson_video_progress_staff_read"
  on public.lesson_video_progress for select to authenticated
  using (public.auth_role() = any (array['admin', 'teacher', 'student_manager']));
