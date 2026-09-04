-- لوحة الأدمن تحتاج قراءة اشتراكات المتاجر لعرض قيمة الباقة بدل صفر.
-- نفس أدوار سياسة enrollments_select بالضبط، بلا أي توسيع.
drop policy if exists "Students can read their own store subscriptions" on public.store_subscriptions;

create policy "store_subscriptions_select"
  on public.store_subscriptions
  for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or public.auth_role() = any (array['admin', 'teacher', 'student_manager'])
  );
