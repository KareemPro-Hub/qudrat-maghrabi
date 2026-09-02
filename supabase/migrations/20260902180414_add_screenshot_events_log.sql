-- سجل لقطات الشاشة داخل التطبيق. أبل مابتتيحش منع اللقطة، لكن بتبلّغ التطبيق
-- بعد حدوثها — فبنسجّلها باسم الطالب والدرس عشان يبقى في مساءلة، ونحذّر الطالب.
create table if not exists public.screenshot_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);

create index if not exists screenshot_events_student_idx
  on public.screenshot_events (student_id, created_at desc);
create index if not exists screenshot_events_lesson_idx
  on public.screenshot_events (lesson_id);

alter table public.screenshot_events enable row level security;

-- الطالب يسجّل واقعته هو بس، ومايقدرش يقرا ولا يعدّل ولا يمسح أي حاجة.
create policy screenshot_events_insert_own on public.screenshot_events
  for insert to authenticated
  with check (student_id = (select auth.uid()));

-- القراءة للإدارة فقط.
create policy screenshot_events_admin_select on public.screenshot_events
  for select to authenticated
  using (public.auth_role() = any (array['admin', 'teacher', 'student_manager']));

revoke update, delete on public.screenshot_events from authenticated, anon;
