-- دور quiz_manager بيقدر يدير الاختبارات والأسئلة بالكامل، لكن سياسة قراءة
-- الدروس اتكتبت لـ admin/teacher/content_manager بس ونسيته. النتيجة: في قائمة
-- «الدرس المرتبط» داخل شاشة الاختبارات كان بيشوف الدروس المجانية فقط، والدروس
-- المدفوعة مختفية عنه تمامًا فما يقدرش يربط بيها اختبار.
-- التعديل قراءة فقط — صلاحيات الإضافة والتعديل والحذف على الدروس لم تُمس.
drop policy if exists lessons_enrolled_read on public.lessons;

create policy lessons_enrolled_read on public.lessons
  for select
  using (
    public.has_active_course_access((select auth.uid()), course_id)
    or public.auth_role() = any (
      array['admin', 'teacher', 'content_manager', 'quiz_manager']
    )
  );
