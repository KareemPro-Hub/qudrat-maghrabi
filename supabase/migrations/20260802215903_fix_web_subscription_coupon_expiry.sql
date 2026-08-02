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

  update private.discount_code_reservations as r
  set status = 'released', updated_at = now()
  where r.discount_code_id = v_code.id
    and r.status = 'pending'
    and r.expires_at < now();

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
