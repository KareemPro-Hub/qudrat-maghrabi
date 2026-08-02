alter table public.store_subscription_plans
  add column if not exists web_price_minor bigint,
  add column if not exists web_currency text;

update public.store_subscription_plans
set web_price_minor = case plan_code
      when 'monthly' then 4900
      when 'quarterly' then 9900
      when 'semiannual' then 17900
      else web_price_minor
    end,
    web_currency = coalesce(web_currency, 'EGP'),
    updated_at = now()
where plan_code in ('monthly', 'quarterly', 'semiannual');

alter table public.store_subscription_plans
  drop constraint if exists store_subscription_plans_web_price_check,
  add constraint store_subscription_plans_web_price_check
    check (web_price_minor is null or web_price_minor > 0),
  drop constraint if exists store_subscription_plans_web_currency_check,
  add constraint store_subscription_plans_web_currency_check
    check (web_currency is null or web_currency ~ '^[A-Z]{3}$');

grant select on public.store_subscription_plans to authenticated;

comment on column public.store_subscription_plans.web_price_minor is
  'Paymob web price snapshot in the smallest currency unit.';
comment on column public.store_subscription_plans.web_currency is
  'Paymob processing currency for web checkout.';

alter table public.payment_attempts
  add column if not exists subscription_product_id text
    references public.store_subscription_plans(product_id) on delete restrict,
  add column if not exists subscription_duration_months integer;

alter table public.payment_attempts
  drop constraint if exists payment_attempts_subscription_snapshot_check,
  add constraint payment_attempts_subscription_snapshot_check
    check (
      (subscription_product_id is null and subscription_duration_months is null)
      or
      (subscription_product_id is not null and subscription_duration_months in (1, 3, 6))
    );

alter table public.payment_attempts
  drop constraint if exists payment_attempts_amount_minor_check,
  add constraint payment_attempts_amount_minor_check check (amount_minor >= 0);

alter table public.payment_attempts
  drop constraint if exists payment_attempts_discount_percent_check,
  add constraint payment_attempts_discount_percent_check
    check (discount_percent is null or discount_percent in (25, 50, 75, 100));

create index if not exists payment_attempts_subscription_product_idx
  on public.payment_attempts(subscription_product_id)
  where subscription_product_id is not null;

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

  select * into v_profile
  from public.profiles
  where id = v_uid;

  if not found or v_profile.role <> 'student' or not v_profile.is_active then
    return jsonb_build_object('success', false, 'message', 'الكود متاح لحساب الطالب النشط فقط');
  end if;

  select lower(trim(u.email)) into v_user_email
  from auth.users u
  where u.id = v_uid;

  select * into v_plan
  from public.store_subscription_plans
  where plan_code = lower(trim(p_plan_code))
    and is_active = true
    and web_price_minor is not null
    and web_currency is not null;

  if not found then
    return jsonb_build_object('success', false, 'message', 'الباقة غير متاحة حاليًا');
  end if;

  select * into v_code
  from public.discount_codes
  where upper(code) = upper(trim(p_code));

  if not found then
    return jsonb_build_object('success', false, 'message', 'كود الخصم غير صحيح');
  end if;

  update private.discount_code_reservations
  set status = 'released', updated_at = now()
  where discount_code_id = v_code.id
    and status = 'pending'
    and expires_at < now();

  select count(*) into v_reserved_count
  from private.discount_code_reservations r
  where r.discount_code_id = v_code.id
    and r.status = 'pending'
    and r.expires_at >= now();

  if not v_code.is_active then
    return jsonb_build_object('success', false, 'message', 'كود الخصم غير مفعّل حاليًا');
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('success', false, 'message', 'انتهت صلاحية هذا الكود');
  end if;
  if nullif(trim(v_code.allowed_email), '') is null
     or lower(trim(v_code.allowed_email)) <> v_user_email then
    return jsonb_build_object('success', false, 'message', 'هذا الكود مخصص لحساب آخر');
  end if;
  if v_code.max_uses is not null
     and v_code.used_count + v_reserved_count >= v_code.max_uses then
    return jsonb_build_object('success', false, 'message', 'تم استخدام هذا الكود بالحد الأقصى المسموح');
  end if;

  return jsonb_build_object(
    'success', true,
    'discount_percent', v_code.discount_percent,
    'plan_code', v_plan.plan_code
  );
end;
$function$;

revoke all on function public.validate_web_subscription_coupon(text, text)
  from public, anon;
grant execute on function public.validate_web_subscription_coupon(text, text)
  to authenticated, service_role;

create or replace function public.grant_web_subscription_coupon(
  p_student_id uuid,
  p_plan_code text,
  p_code text
)
returns table (
  attempt_id uuid,
  course_id uuid,
  enrollment_id uuid,
  expires_at timestamptz
)
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
  if not exists (
    select 1 from public.profiles
    where id = p_student_id and role = 'student' and is_active = true
  ) then
    raise exception 'A valid student account is required';
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id = p_student_id;

  select * into v_plan
  from public.store_subscription_plans
  where plan_code = lower(trim(p_plan_code))
    and is_active = true
    and web_price_minor is not null
    and web_currency is not null;
  if not found then
    raise exception 'Unknown or inactive web subscription plan';
  end if;

  select * into v_code
  from public.discount_codes
  where upper(code) = upper(trim(p_code))
  for update;
  if not found
     or not v_code.is_active
     or v_code.discount_percent <> 100
     or nullif(trim(v_code.allowed_email), '') is null
     or lower(trim(v_code.allowed_email)) <> v_email
     or (v_code.expires_at is not null and v_code.expires_at < now()) then
    raise exception 'Discount code is not valid for this subscription';
  end if;

  update private.discount_code_reservations
  set status = 'released', updated_at = now()
  where discount_code_id = v_code.id
    and status = 'pending'
    and expires_at < now();

  select count(*) into v_reserved_count
  from private.discount_code_reservations r
  where r.discount_code_id = v_code.id
    and r.status = 'pending'
    and r.expires_at >= now();

  if v_code.max_uses is not null
     and v_code.used_count + v_reserved_count >= v_code.max_uses then
    raise exception 'Discount code usage limit reached';
  end if;

  select e.id, e.expires_at
    into v_enrollment_id, v_existing_expiry
  from public.enrollments e
  where e.student_id = p_student_id
    and e.course_id = v_plan.bundle_course_id
  for update;

  v_expires_at := greatest(coalesce(v_existing_expiry, now()), now())
    + make_interval(months => v_plan.duration_months);

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
    set payment_status = 'paid',
        amount_paid = 0,
        payment_method = 'discount_code',
        payment_reference = 'coupon:' || v_attempt_id::text,
        discount_code_id = v_code.id,
        enrolled_at = now(),
        expires_at = v_expires_at
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
    jsonb_build_object('plan_code', v_plan.plan_code, 'source', '100_percent_coupon'),
    now()
  );

  update public.discount_codes
  set used_count = used_count + 1
  where id = v_code.id;

  attempt_id := v_attempt_id;
  course_id := v_plan.bundle_course_id;
  enrollment_id := v_enrollment_id;
  expires_at := v_expires_at;
  return next;
end;
$function$;

revoke all on function public.grant_web_subscription_coupon(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.grant_web_subscription_coupon(uuid, text, text)
  to service_role;

create or replace function public.finalize_paymob_payment(
  p_attempt_id uuid,
  p_transaction_id text,
  p_order_id text default null,
  p_method text default null
)
returns table (
  student_id uuid,
  course_id uuid,
  enrollment_id uuid,
  already_paid boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_reservation_status text;
  v_existing_expiry timestamptz;
  v_new_expiry timestamptz;
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'A provider transaction ID is required';
  end if;

  select pa.* into v_attempt
  from public.payment_attempts pa
  where pa.id = p_attempt_id and pa.provider = 'paymob'
  for update;
  if not found then
    raise exception 'Payment attempt was not found';
  end if;

  student_id := v_attempt.student_id;
  course_id := v_attempt.course_id;
  enrollment_id := v_attempt.enrollment_id;

  if v_attempt.status = 'paid' then
    already_paid := true;
    return next;
    return;
  end if;

  if v_attempt.subscription_product_id is not null then
    if v_attempt.subscription_duration_months not in (1, 3, 6) then
      raise exception 'Invalid subscription duration snapshot';
    end if;
    select e.expires_at into v_existing_expiry
    from public.enrollments e
    where e.id = v_attempt.enrollment_id
      and e.student_id = v_attempt.student_id
      and e.course_id = v_attempt.course_id
    for update;
    if not found then
      raise exception 'Enrollment linked to payment attempt was not found';
    end if;
    v_new_expiry := greatest(coalesce(v_existing_expiry, now()), now())
      + make_interval(months => v_attempt.subscription_duration_months);
  end if;

  if v_attempt.discount_code_id is not null then
    select r.status into v_reservation_status
    from private.discount_code_reservations r
    where r.attempt_id = v_attempt.id
      and r.discount_code_id = v_attempt.discount_code_id
      and r.student_id = v_attempt.student_id
    for update;
    if not found or v_reservation_status <> 'pending' then
      raise exception 'A valid discount reservation is required';
    end if;
  end if;

  update public.payment_attempts pa
  set status = 'paid',
      provider_transaction_id = p_transaction_id,
      provider_order_id = coalesce(p_order_id, pa.provider_order_id),
      payment_method = coalesce(nullif(btrim(p_method), ''), 'paymob'),
      failure_reason = null,
      paid_at = now()
  where pa.id = v_attempt.id;

  update public.enrollments e
  set payment_status = 'paid',
      payment_method = 'paymob',
      payment_reference = p_transaction_id,
      amount_paid = v_attempt.amount_minor / 100.0,
      discount_code_id = v_attempt.discount_code_id,
      enrolled_at = now(),
      expires_at = coalesce(v_new_expiry, e.expires_at)
  where e.id = v_attempt.enrollment_id
    and e.student_id = v_attempt.student_id
    and e.course_id = v_attempt.course_id;
  if not found then
    raise exception 'Enrollment linked to payment attempt was not found';
  end if;

  if v_attempt.discount_code_id is not null then
    update public.discount_codes dc
    set used_count = used_count + 1
    where dc.id = v_attempt.discount_code_id;
    if not found then
      raise exception 'Discount code linked to payment attempt was not found';
    end if;

    update private.discount_code_reservations
    set status = 'redeemed', updated_at = now()
    where attempt_id = v_attempt.id and status = 'pending';
    if not found then
      raise exception 'Discount reservation could not be completed';
    end if;
  end if;

  already_paid := false;
  return next;
end;
$function$;

revoke all on function public.finalize_paymob_payment(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.finalize_paymob_payment(uuid, text, text, text)
  to service_role;
