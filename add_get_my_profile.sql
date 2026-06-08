-- ============================================================
-- دالة get_my_profile()
-- تُرجع بيانات المستخدم الحالي من جدول profiles
-- شغّل هذا الملف في: Supabase → SQL Editor → Run
-- ============================================================

DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;

-- منح الصلاحية لأي مستخدم مسجّل الدخول
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
