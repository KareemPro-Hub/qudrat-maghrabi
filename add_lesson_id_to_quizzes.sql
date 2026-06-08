-- ============================================================
-- ربط الاختبار بدرس محدد
-- شغّل في: Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;
