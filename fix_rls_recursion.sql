-- ============================================================
-- إصلاح خطأ "حدث خطأ" عند إضافة كورس / درس
-- السبب: تكرار لا نهائي في سياسات RLS (سياسة profiles تسأل جدول profiles نفسه)
-- الحل: دالة SECURITY DEFINER تقرأ الدور بدون تشغيل RLS + إعادة كتابة السياسات
-- شغّل هذا الملف بالكامل مرة واحدة في: Supabase → SQL Editor → Run
-- ============================================================

-- 1) دالة تُرجع دور المستخدم الحالي بدون المرور على RLS (تكسر التكرار)
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- 2) إعادة كتابة كل السياسات لتستخدم auth_role() بدل الاستعلام المتكرر
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"  ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"  ON public.profiles FOR ALL
  USING (public.auth_role() IN ('admin','teacher'));

-- Courses
DROP POLICY IF EXISTS "courses_public_read"  ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_all"  ON public.courses;
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_teacher_all" ON public.courses FOR ALL
  USING (public.auth_role() IN ('admin','teacher','content_manager'));

-- Lessons
DROP POLICY IF EXISTS "lessons_enrolled_read" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_all"   ON public.lessons;
CREATE POLICY "lessons_enrolled_read" ON public.lessons FOR SELECT USING (
  is_free_preview = true
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = lessons.course_id
      AND e.payment_status = 'paid'
  )
  OR public.auth_role() IN ('admin','teacher','content_manager')
);
CREATE POLICY "lessons_teacher_all" ON public.lessons FOR ALL
  USING (public.auth_role() IN ('admin','teacher','content_manager'));

-- Enrollments
DROP POLICY IF EXISTS "enrollments_student_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own"  ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_admin_all"   ON public.enrollments;
CREATE POLICY "enrollments_student_own" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "enrollments_insert_own"  ON public.enrollments FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "enrollments_admin_all"   ON public.enrollments FOR ALL
  USING (public.auth_role() IN ('admin','teacher','student_manager'));

-- Progress
DROP POLICY IF EXISTS "progress_own"          ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_teacher_read" ON public.lesson_progress;
CREATE POLICY "progress_own"          ON public.lesson_progress FOR ALL    USING (student_id = auth.uid());
CREATE POLICY "progress_teacher_read" ON public.lesson_progress FOR SELECT USING (public.auth_role() IN ('admin','teacher'));

-- Quizzes
DROP POLICY IF EXISTS "quizzes_enrolled_read" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_teacher_all"   ON public.quizzes;
CREATE POLICY "quizzes_enrolled_read" ON public.quizzes FOR SELECT USING (
  (is_published = true AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = quizzes.course_id
      AND e.payment_status = 'paid'
  ))
  OR public.auth_role() IN ('admin','teacher')
);
CREATE POLICY "quizzes_teacher_all" ON public.quizzes FOR ALL
  USING (public.auth_role() IN ('admin','teacher'));

-- Quiz Questions
DROP POLICY IF EXISTS "questions_read"        ON public.quiz_questions;
DROP POLICY IF EXISTS "questions_teacher_all" ON public.quiz_questions;
CREATE POLICY "questions_read"        ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "questions_teacher_all" ON public.quiz_questions FOR ALL
  USING (public.auth_role() IN ('admin','teacher'));

-- Quiz Results
DROP POLICY IF EXISTS "results_own"         ON public.quiz_results;
DROP POLICY IF EXISTS "results_teacher_read" ON public.quiz_results;
CREATE POLICY "results_own"          ON public.quiz_results FOR ALL    USING (student_id = auth.uid());
CREATE POLICY "results_teacher_read" ON public.quiz_results FOR SELECT USING (public.auth_role() IN ('admin','teacher'));

-- Notifications
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- ✅ تم. جرّب إضافة كورس مرة أخرى.
