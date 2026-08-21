-- A blank allowed_email means the discount code is public.
-- A populated allowed_email keeps the code restricted to that one account.

create or replace function public.validate_web_subscription_coupon(
  p_code text,
  p_plan_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_profile public.profiles%rowtype;
  v_plan public.store_subscription_plans%rowtype;
  v_code public.discount_codes%rowtype;
  v_reserved_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'message', 'يجب تسجيل الدخول أولًا');
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.role <> 'student' or not v_profile.is_active then
    return jsonb_build_object('success', false, 'message', 'الكود متاح لحساب الطالب النشط فقط');
  end if;

  select lower(trim(u.email)) into v_user_email from auth.users u where u.id = v_uid;
  select * into v_plan
  from public.store_subscription_plans
  where plan_code = lower(trim(p_plan_code))
    and is_active = true
    and web_price_minor is not null
    and web_currency is not null;
  if not found then
    return jsonb_build_object('success', false, 'message', 'الباقة غير متاحة حاليًا');
  end if;

  select * into v_code from public.discount_codes where upper(code) = upper(trim(p_code));
  if not found then
    return jsonb_build_object('success', false, 'message', 'كود الخصم غير صحيح');
  end if;

  update private.discount_code_reservations
  set status = 'released', updated_at = now()
  where discount_code_id = v_code.id and status = 'pending' and expires_at < now();

  select count(*) into v_reserved_count
  from private.discount_code_reservations r
  where r.discount_code_id = v_code.id and r.status = 'pending' and r.expires_at >= now();

  if not v_code.is_active then
    return jsonb_build_object('success', false, 'message', 'كود الخصم غير مفعّل حاليًا');
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('success', false, 'message', 'انتهت صلاحية هذا الكود');
  end if;
  if nullif(trim(v_code.allowed_email), '') is not null
     and lower(trim(v_code.allowed_email)) <> v_user_email then
    return jsonb_build_object('success', false, 'message', 'هذا الكود مخصص لحساب آخر');
  end if;
  if v_code.max_uses is not null and v_code.used_count + v_reserved_count >= v_code.max_uses then
    return jsonb_build_object('success', false, 'message', 'تم استخدام هذا الكود بالحد الأقصى المسموح');
  end if;

  return jsonb_build_object('success', true, 'discount_percent', v_code.discount_percent, 'plan_code', v_plan.plan_code);
end;
$function$;

create or replace function public.grant_web_subscription_coupon(
  p_student_id uuid,
  p_plan_code text,
  p_code text
)
returns table (attempt_id uuid, course_id uuid, enrollment_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_plan public.store_subscription_plans%rowtype;
  v_code public.discount_codes%rowtype;
  v_email text;
  v_reserved_count integer;
  v_existing_expiry timestamptz;
  v_attempt_id uuid := gen_random_uuid();
  v_enrollment_id uuid;
  v_expires_at timestamptz;
begin
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student' and is_active = true) then
    raise exception 'A valid student account is required';
  end if;

  select lower(trim(u.email)) into v_email from auth.users u where u.id = p_student_id;
  select * into v_plan
  from public.store_subscription_plans
  where plan_code = lower(trim(p_plan_code))
    and is_active = true
    and web_price_minor is not null
    and web_currency is not null;
  if not found then
    raise exception 'Unknown or inactive web subscription plan';
  end if;

  select * into v_code from public.discount_codes where upper(code) = upper(trim(p_code)) for update;
  if not found
     or not v_code.is_active
     or v_code.discount_percent <> 100
     or (nullif(trim(v_code.allowed_email), '') is not null and lower(trim(v_code.allowed_email)) <> v_email)
     or (v_code.expires_at is not null and v_code.expires_at < now()) then
    raise exception 'Discount code is not valid for this subscription';
  end if;

  update private.discount_code_reservations as r
  set status = 'released', updated_at = now()
  where r.discount_code_id = v_code.id and r.status = 'pending' and r.expires_at < now();

  select count(*) into v_reserved_count
  from private.discount_code_reservations r
  where r.discount_code_id = v_code.id and r.status = 'pending' and r.expires_at >= now();
  if v_code.max_uses is not null and v_code.used_count + v_reserved_count >= v_code.max_uses then
    raise exception 'Discount code usage limit reached';
  end if;

  select e.id, e.expires_at into v_enrollment_id, v_existing_expiry
  from public.enrollments e
  where e.student_id = p_student_id and e.course_id = v_plan.bundle_course_id
  for update;

  v_expires_at := greatest(coalesce(v_existing_expiry, now()), now()) + make_interval(months => v_plan.duration_months);
  if v_enrollment_id is null then
    insert into public.enrollments (
      student_id, course_id, payment_status, amount_paid, payment_method,
      payment_reference, discount_code_id, enrolled_at, expires_at
    ) values (
      p_student_id, v_plan.bundle_course_id, 'paid', 0, 'discount_code',
      'coupon:' || v_attempt_id::text, v_code.id, now(), v_expires_at
    ) returning id into v_enrollment_id;
  else
    update public.enrollments
    set payment_status = 'paid', amount_paid = 0, payment_method = 'discount_code',
        payment_reference = 'coupon:' || v_attempt_id::text, discount_code_id = v_code.id,
        enrolled_at = now(), expires_at = v_expires_at
    where id = v_enrollment_id;
  end if;

  insert into public.payment_attempts (
    id, student_id, course_id, enrollment_id, provider, status,
    amount_minor, original_amount_minor, discount_code_id, discount_percent,
    currency, provider_transaction_id, payment_method,
    subscription_product_id, subscription_duration_months, metadata, paid_at
  ) values (
    v_attempt_id, p_student_id, v_plan.bundle_course_id, v_enrollment_id,
    'coupon', 'paid', 0, v_plan.web_price_minor, v_code.id, 100,
    v_plan.web_currency, 'coupon:' || v_attempt_id::text, 'discount_code',
    v_plan.product_id, v_plan.duration_months,
    jsonb_build_object('plan_code', v_plan.plan_code, 'source', '100_percent_coupon'), now()
  );

  update public.discount_codes set used_count = used_count + 1 where id = v_code.id;
  attempt_id := v_attempt_id;
  course_id := v_plan.bundle_course_id;
  enrollment_id := v_enrollment_id;
  expires_at := v_expires_at;
  return next;
end;
$function$;

create or replace function public.reserve_discount_code_for_payment(p_attempt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_code public.discount_codes%rowtype;
  v_student_email text;
  v_reserved_count integer;
  v_expected_amount bigint;
begin
  select pa.* into v_attempt
  from public.payment_attempts pa
  where pa.id = p_attempt_id and pa.provider = 'paymob' and pa.status = 'pending'
  for update;
  if not found or v_attempt.discount_code_id is null or v_attempt.discount_percent is null or v_attempt.original_amount_minor is null then
    raise exception 'Invalid discounted payment attempt';
  end if;

  select dc.* into v_code from public.discount_codes dc where dc.id = v_attempt.discount_code_id for update;
  if not found then
    raise exception 'Discount code was not found';
  end if;
  select lower(trim(u.email)) into v_student_email from auth.users u where u.id = v_attempt.student_id;
  v_expected_amount := round(v_attempt.original_amount_minor::numeric * (100 - v_attempt.discount_percent)::numeric / 100)::bigint;

  if v_attempt.discount_percent not in (25, 50, 75)
    or v_code.discount_percent <> v_attempt.discount_percent
    or v_attempt.amount_minor <> greatest(1, v_expected_amount)
    or not v_code.is_active
    or (v_code.expires_at is not null and v_code.expires_at < now())
    or (nullif(trim(v_code.allowed_email), '') is not null and lower(trim(v_code.allowed_email)) <> v_student_email) then
    raise exception 'Discount code is not valid for this payment';
  end if;

  update private.discount_code_reservations
  set status = 'released', updated_at = now()
  where discount_code_id = v_code.id and status = 'pending' and expires_at < now();
  select count(*) into v_reserved_count
  from private.discount_code_reservations r
  where r.discount_code_id = v_code.id and r.status = 'pending' and r.expires_at >= now();
  if v_code.max_uses is not null and v_code.used_count + v_reserved_count >= v_code.max_uses then
    raise exception 'Discount code usage limit reached';
  end if;

  insert into private.discount_code_reservations(attempt_id, discount_code_id, student_id)
  values (v_attempt.id, v_code.id, v_attempt.student_id);
  return true;
end;
$function$;

revoke all on function public.validate_web_subscription_coupon(text, text) from public, anon;
grant execute on function public.validate_web_subscription_coupon(text, text) to authenticated, service_role;
revoke all on function public.grant_web_subscription_coupon(uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_web_subscription_coupon(uuid, text, text) to service_role;
revoke all on function public.reserve_discount_code_for_payment(uuid) from public, anon, authenticated;
grant execute on function public.reserve_discount_code_for_payment(uuid) to service_role;
