-- ============================================================
-- إضافة صورة ورابط لأسئلة الاختبارات
-- شغّل في: Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_image_url TEXT,
  ADD COLUMN IF NOT EXISTS question_link_url  TEXT,
  ADD COLUMN IF NOT EXISTS question_link_text TEXT;
