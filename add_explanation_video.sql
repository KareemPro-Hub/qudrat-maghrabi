-- ============================================================
-- إضافة حقل فيديو الشرح لجدول أسئلة الاختبارات
-- شغّل في: Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS explanation_video_id TEXT;
