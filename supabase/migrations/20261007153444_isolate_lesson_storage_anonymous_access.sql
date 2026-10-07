drop policy lesson_files_storage_read on storage.objects;

create policy lesson_files_storage_staff_read
on storage.objects for select to authenticated
using (
  bucket_id = 'lesson-files'
  and public.auth_role() in ('admin', 'teacher', 'content_manager')
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
);

create policy lesson_files_storage_student_read
on storage.objects for select to authenticated
using (
  bucket_id = 'lesson-files'
  and exists (
    select 1 from public.lesson_files f join public.lessons l on l.id = f.lesson_id
    where f.storage_path = storage.objects.name and l.is_published
      and (l.is_free_preview or (
        public.has_active_course_access((select auth.uid()), l.course_id)
        and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
      ))
  )
);

create policy lesson_files_storage_preview_read
on storage.objects for select to anon
using (
  bucket_id = 'lesson-files'
  and exists (
    select 1 from public.lesson_files f join public.lessons l on l.id = f.lesson_id
    where f.storage_path = storage.objects.name and l.is_published and l.is_free_preview
  )
);
