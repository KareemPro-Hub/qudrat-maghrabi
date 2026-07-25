-- حذف الحساب نهائيًا بطلب من صاحبه (متطلب سياسات Google Play وApp Store).
-- تُوثّق هذه الهجرة الدالة المطبّقة في قاعدة البيانات وتُحصّنها:
--   1) قصر الحذف الذاتي على حسابات المستخدمين النهائيين فقط (student وparent).
--   2) منع جميع أدوار الإدارة والفريق من حذف أنفسهم ، فحساباتهم تُدار عبر الدعم.
--   3) رفض الحذف إذا كان الحساب مالكًا لأي محتوى (كورسات أو أسئلة أو أكواد خصم)
--      حتى لا يُترك محتوى المنصة بلا مالك.
--   4) قصر صلاحية التنفيذ على المستخدم المسجّل دخوله فقط.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_role_name text;
  owned_courses integer;
  owned_questions integer;
  owned_discount_codes integer;
begin
  if current_user_id is null then
    raise exception 'يجب تسجيل الدخول قبل حذف الحساب'
      using errcode = '28000';
  end if;

  select p.role into current_role_name
  from public.profiles p
  where p.id = current_user_id;

  if current_role_name is null then
    raise exception 'تعذّر العثور على ملف الحساب'
      using errcode = '42501';
  end if;

  -- الحذف الذاتي متاح لحسابات الطلاب وأولياء الأمور فقط.
  if current_role_name not in ('student', 'parent') then
    raise exception 'حسابات الإدارة وفريق العمل لا تُحذف ذاتيًا ، يُرجى التواصل مع الدعم'
      using errcode = '42501';
  end if;

  -- شبكة أمان: لا نسمح بترك أي محتوى للمنصة بلا مالك.
  select count(*) into owned_courses
  from public.courses c
  where c.created_by = current_user_id;

  select count(*) into owned_questions
  from public.quiz_questions q
  where q.created_by = current_user_id;

  select count(*) into owned_discount_codes
  from public.discount_codes d
  where d.created_by = current_user_id;

  if owned_courses > 0 or owned_questions > 0 or owned_discount_codes > 0 then
    raise exception 'لا يمكن حذف حساب مرتبط بمحتوى منشور على المنصة ، يُرجى التواصل مع الدعم'
      using errcode = '42501';
  end if;

  -- بيانات الطالب أو ولي الأمر مرتبطة بـ on delete cascade فتُحذف تلقائيًا.
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.delete_my_account() to service_role;
