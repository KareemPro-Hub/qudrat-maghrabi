-- سياسة قراءة ملفات الدرس كانت بتفحص وجود enrollment مدفوع على كورس الدرس نفسه
-- بس، من غير ما تفحص تاريخ الانتهاء ولا الاشتراك على الكورس الأب. النتيجة:
--   1) الطالب اللي خلص اشتراكه يفضل ينزّل الملفات للأبد.
--   2) الأخطر: المشترك في الباقة (اشتراكه على الكورس الأب) مكانش بيشوف ملفات
--      الدروس المدفوعة إطلاقًا، لأن الـ enrollment بتاعه على الكورس الأب مش على
--      الكورس الفرعي اللي فيه الدرس.
-- الحل: نستخدم نفس الدالة المرجعية اللي بيستخدمها باقي المحتوى
-- has_active_course_access() اللي بتغطي الانتهاء والكورس الأب والكورس المجاني.
drop policy if exists lesson_files_select on public.lesson_files;

create policy lesson_files_select on public.lesson_files
  for select
  using (
    exists (
      select 1
      from public.lessons l
      where l.id = lesson_files.lesson_id
        and (
          l.is_free_preview = true
          or public.has_active_course_access((select auth.uid()), l.course_id)
          or public.auth_role() = any (array['admin', 'teacher', 'content_manager'])
        )
    )
  );
