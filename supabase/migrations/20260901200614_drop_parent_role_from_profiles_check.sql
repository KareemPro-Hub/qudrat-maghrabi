-- ميزة ولي الأمر اتلغت، ومفيش حساب واحد بالدور ده، ومفيش أي شاشة بتنشئه.
-- بنشيل القيمة من قيد الأدوار عشان ما تترجعش بالغلط.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['student','teacher','content_manager','student_manager','admin','quiz_manager']));
