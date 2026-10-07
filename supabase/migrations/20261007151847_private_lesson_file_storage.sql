alter table public.lesson_files add column storage_path text;
create unique index lesson_files_storage_path_unique on public.lesson_files (storage_path) where storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 52428800);

create policy lesson_files_storage_read
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'lesson-files'
  and (
    (
      public.auth_role() in ('admin', 'teacher', 'content_manager')
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
    )
    or exists (
      select 1 from public.lesson_files f
      join public.lessons l on l.id = f.lesson_id
      where f.storage_path = storage.objects.name
        and l.is_published
        and (
          l.is_free_preview
          or (
            public.has_active_course_access((select auth.uid()), l.course_id)
            and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
          )
        )
    )
  )
);

create policy lesson_files_storage_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'lesson-files'
  and public.auth_role() in ('admin', 'teacher', 'content_manager')
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
  and exists (select 1 from public.lessons l where l.id::text = (storage.foldername(name))[1])
);

create policy lesson_files_storage_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'lesson-files'
  and public.auth_role() in ('admin', 'teacher', 'content_manager')
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
);
