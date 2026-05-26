-- ============================================================
-- منصة قدرات المغربي — إعداد قاعدة البيانات الكاملة
-- ============================================================

-- 1. جدول الملفات الشخصية
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student','parent','teacher','content_manager','student_manager','admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الكورسات
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  level TEXT DEFAULT 'beginner'
    CHECK (level IN ('beginner','intermediate','advanced')),
  duration_hours NUMERIC(5,1),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الدروس
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  is_free_preview BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول الاشتراكات
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method TEXT,
  payment_reference TEXT,
  amount_paid NUMERIC(10,2),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id)
);

-- 5. جدول تقدم الطالب في الدروس
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  watch_percentage INTEGER DEFAULT 0 CHECK (watch_percentage BETWEEN 0 AND 100),
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- 6. جدول الاختبارات
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_marks INTEGER DEFAULT 10,
  pass_marks INTEGER DEFAULT 6,
  time_limit_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. جدول أسئلة الاختبارات
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a','b','c','d')),
  marks INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  explanation TEXT
);

-- 8. جدول نتائج الاختبارات
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_marks INTEGER NOT NULL,
  passed BOOLEAN DEFAULT false,
  answers JSONB,
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. جدول الإشعارات
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','enrollment','payment')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- التريجرز والدوال
-- ============================================================

-- دالة إنشاء Profile تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تريجر يعمل تلقائياً عند إنشاء مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- دالة إرسال إشعار عند الاشتراك في كورس
CREATE OR REPLACE FUNCTION public.notify_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' THEN
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (
      NEW.student_id,
      'تم تفعيل اشتراكك بنجاح! 🎉',
      'يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم',
      'enrollment'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_enrollment_paid ON public.enrollments;
CREATE TRIGGER on_enrollment_paid
  AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_enrollment();

-- ============================================================
-- Row Level Security (RLS) — حماية البيانات
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))
);

-- Courses
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_all" ON public.courses;
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_teacher_all" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','content_manager'))
);

-- Lessons
DROP POLICY IF EXISTS "lessons_enrolled_read" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_all" ON public.lessons;
CREATE POLICY "lessons_enrolled_read" ON public.lessons FOR SELECT USING (
  is_free_preview = true
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = lessons.course_id
      AND e.payment_status = 'paid'
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','content_manager'))
);
CREATE POLICY "lessons_teacher_all" ON public.lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','content_manager'))
);

-- Enrollments
DROP POLICY IF EXISTS "enrollments_student_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_student_own" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "enrollments_insert_own" ON public.enrollments FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "enrollments_admin_all" ON public.enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','student_manager'))
);

-- Progress
DROP POLICY IF EXISTS "progress_own" ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_teacher_read" ON public.lesson_progress;
CREATE POLICY "progress_own" ON public.lesson_progress FOR ALL USING (student_id = auth.uid());
CREATE POLICY "progress_teacher_read" ON public.lesson_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))
);

-- Quizzes
DROP POLICY IF EXISTS "quizzes_enrolled_read" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_teacher_all" ON public.quizzes;
CREATE POLICY "quizzes_enrolled_read" ON public.quizzes FOR SELECT USING (
  is_published = true AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.course_id = quizzes.course_id
      AND e.payment_status = 'paid'
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))
);
CREATE POLICY "quizzes_teacher_all" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))
);

-- Quiz Questions
DROP POLICY IF EXISTS "questions_read" ON public.quiz_questions;
DROP POLICY IF EXISTS "questions_teacher_all" ON public.quiz_questions;
CREATE POLICY "questions_read" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "questions_teacher_all" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))
);

-- Quiz Results
DROP POLICY IF EXISTS "results_own" ON public.quiz_results;
DROP POLICY IF EXISTS "results_teacher_read" ON public.quiz_results;
CREATE POLICY "results_own" ON public.quiz_results FOR ALL USING (student_id = auth.uid());
CREATE POLICY "results_teacher_read" ON public.quiz_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))
);

-- Notifications
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- بيانات تجريبية للاختبار
-- ============================================================

INSERT INTO public.courses (title, description, price, is_published, is_featured, level, duration_hours)
VALUES
  ('القدرات الكمي — المستوى الأساسي', 'أساسيات الرياضيات والأنماط الرقمية وأساليب الحل السريع للمبتدئين', 199, true, true, 'beginner', 12),
  ('القدرات الكمي — المستوى المتوسط', 'تعمق في مسائل الجبر والهندسة والاحتمالات مع اختصار الوقت', 249, true, false, 'intermediate', 18),
  ('القدرات الكمي — المستوى المتقدم', 'كل الأبواب بمستوى متقدم مع اختبارات على نمط الاختبار الحقيقي', 299, true, false, 'advanced', 24),
  ('باقة القدرات الكاملة', 'الكورسات الثلاثة مجتمعة بسعر مخفض — من الصفر حتى التفوق', 599, true, true, 'advanced', 54)
ON CONFLICT DO NOTHING;
