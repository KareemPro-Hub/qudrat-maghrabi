alter table public.discount_codes
  add column if not exists allowed_email text;

comment on column public.discount_codes.allowed_email is
  'Normalized email address of the only account allowed to redeem this code. NULL keeps legacy codes unrestricted.';

create or replace function public.redeem_discount_code(
  p_code text,
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code record;
  v_uid uuid := auth.uid();
  v_user_email text;
  v_enrollment_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'message', 'يجب تسجيل الدخول أولاً');
  end if;

  select lower(trim(u.email))
    into v_user_email
  from auth.users u
  where u.id = v_uid;

  if v_user_email is null then
    return jsonb_build_object('success', false, 'message', 'تعذر التحقق من البريد الإلكتروني للحساب');
  end if;

  select *
    into v_code
  from public.discount_codes
  where upper(code) = upper(trim(p_code))
  for update;

  if v_code is null then
    return jsonb_build_object('success', false, 'message', 'كود الخصم غير صحيح');
  end if;

  if nullif(trim(v_code.allowed_email), '') is not null
     and lower(trim(v_code.allowed_email)) <> v_user_email then
    return jsonb_build_object('success', false, 'message', 'هذا الكود مخصص لحساب آخر');
  end if;

  if not v_code.is_active then
    return jsonb_build_object('success', false, 'message', 'كود الخصم غير مفعّل حالياً');
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('success', false, 'message', 'انتهت صلاحية هذا الكود');
  end if;

  if v_code.max_uses is not null and v_code.used_count >= v_code.max_uses then
    return jsonb_build_object('success', false, 'message', 'تم استخدام هذا الكود بالحد الأقصى المسموح');
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    return jsonb_build_object('success', false, 'message', 'الكورس غير موجود');
  end if;

  select id
    into v_enrollment_id
  from public.enrollments
  where student_id = v_uid
    and course_id = p_course_id;

  if v_enrollment_id is null then
    insert into public.enrollments (
      student_id,
      course_id,
      payment_status,
      amount_paid,
      discount_code_id
    )
    values (
      v_uid,
      p_course_id,
      'paid',
      0,
      v_code.id
    )
    returning id into v_enrollment_id;
  else
    update public.enrollments
    set payment_status = 'paid',
        amount_paid = 0,
        discount_code_id = v_code.id
    where id = v_enrollment_id;
  end if;

  update public.discount_codes
  set used_count = used_count + 1
  where id = v_code.id;

  return jsonb_build_object('success', true, 'enrollment_id', v_enrollment_id);
end;
$function$;

revoke all on function public.redeem_discount_code(text, uuid) from public, anon;
grant execute on function public.redeem_discount_code(text, uuid) to authenticated, service_role;
