-- ============================================================
-- إضافة حقل chapter لجدول lessons
-- شغّل هذا الملف في: Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS chapter TEXT;
