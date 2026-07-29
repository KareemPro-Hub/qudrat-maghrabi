alter table public.discount_codes
  add column if not exists discount_percent smallint not null default 100;

alter table public.discount_codes
  drop constraint if exists discount_codes_discount_percent_check;

alter table public.discount_codes
  add constraint discount_codes_discount_percent_check
  check (discount_percent in (25, 50, 75, 100));

comment on column public.discount_codes.discount_percent is
  'Percentage deducted from the original package price. Allowed values: 25, 50, 75, 100.';

alter table public.payment_attempts
  add column if not exists original_amount_minor bigint,
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null,
  add column if not exists discount_percent smallint;

alter table public.payment_attempts
  drop constraint if exists payment_attempts_original_amount_minor_check;

alter table public.payment_attempts
  add constraint payment_attempts_original_amount_minor_check
  check (original_amount_minor is null or original_amount_minor > 0);

alter table public.payment_attempts
  drop constraint if exists payment_attempts_discount_percent_check;

alter table public.payment_attempts
  add constraint payment_attempts_discount_percent_check
  check (discount_percent is null or discount_percent in (25, 50, 75));

alter table public.payment_attempts
  drop constraint if exists payment_attempts_discount_snapshot_check;

alter table public.payment_attempts
  add constraint payment_attempts_discount_snapshot_check
  check (
    (discount_code_id is null and discount_percent is null and original_amount_minor is null)
    or
    (discount_code_id is not null and discount_percent is not null and original_amount_minor is not null)
  );

create index if not exists payment_attempts_discount_code_idx
  on public.payment_attempts(discount_code_id);

create schema if not exists private;

create table if not exists private.discount_code_reservations (
  attempt_id uuid primary key references public.payment_attempts(id) on delete cascade,
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    constraint discount_code_reservations_status_check
    check (status in ('pending', 'redeemed', 'released')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discount_code_reservations_active_idx
  on private.discount_code_reservations(discount_code_id, status, expires_at);

alter table private.discount_code_reservations enable row level security;
revoke all on private.discount_code_reservations from public, anon, authenticated;

create or replace function public.reserve_discount_code_for_payment(
  p_attempt_id uuid
)
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
  select pa.*
    into v_attempt
  from public.payment_attempts pa
  where pa.id = p_attempt_id
    and pa.provider = 'paymob'
    and pa.status = 'pending'
  for update;

  if not found
     or v_attempt.discount_code_id is null
     or v_attempt.discount_percent is null
     or v_attempt.original_amount_minor is null then
    raise exception 'Invalid discounted payment attempt';
  end if;

  select dc.*
    into v_code
  from public.discount_codes dc
  where dc.id = v_attempt.discount_code_id
  for update;

  if not found then
    raise exception 'Discount code was not found';
  end if;

  select lower(trim(u.email))
    into v_student_email
  from auth.users u
  where u.id = v_attempt.student_id;

  v_expected_amount := round(
    v_attempt.original_amount_minor::numeric
    * (100 - v_attempt.discount_percent)::numeric
    / 100
  )::bigint;

  if v_attempt.discount_percent not in (25, 50, 75)
     or v_code.discount_percent <> v_attempt.discount_percent
     or v_attempt.amount_minor <> greatest(1, v_expected_amount)
     or not v_code.is_active
     or (v_code.expires_at is not null and v_code.expires_at < now())
     or nullif(trim(v_code.allowed_email), '') is null
     or lower(trim(v_code.allowed_email)) <> v_student_email then
    raise exception 'Discount code is not valid for this payment';
  end if;

  update private.discount_code_reservations
  set status = 'released',
      updated_at = now()
  where discount_code_id = v_code.id
    and status = 'pending'
    and expires_at < now();

  select count(*)
    into v_reserved_count
  from private.discount_code_reservations r
  where r.discount_code_id = v_code.id
    and r.status = 'pending'
    and r.expires_at >= now();

  if v_code.max_uses is not null
     and v_code.used_count + v_reserved_count >= v_code.max_uses then
    raise exception 'Discount code usage limit reached';
  end if;

  insert into private.discount_code_reservations (
    attempt_id,
    discount_code_id,
    student_id
  )
  values (
    v_attempt.id,
    v_code.id,
    v_attempt.student_id
  );

  return true;
end;
$function$;

revoke all on function public.reserve_discount_code_for_payment(uuid) from public, anon, authenticated;
grant execute on function public.reserve_discount_code_for_payment(uuid) to service_role;

create or replace function public.release_discount_code_reservation(
  p_attempt_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update private.discount_code_reservations
  set status = 'released',
      updated_at = now()
  where attempt_id = p_attempt_id
    and status = 'pending';

  return found;
end;
$function$;

revoke all on function public.release_discount_code_reservation(uuid) from public, anon, authenticated;
grant execute on function public.release_discount_code_reservation(uuid) to service_role;

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

  if v_code.max_uses is not null and (
    v_code.used_count + (
      select count(*)
      from private.discount_code_reservations r
      where r.discount_code_id = v_code.id
        and r.status = 'pending'
        and r.expires_at >= now()
    )
  ) >= v_code.max_uses then
    return jsonb_build_object('success', false, 'message', 'تم استخدام هذا الكود بالحد الأقصى المسموح');
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    return jsonb_build_object('success', false, 'message', 'الباقة غير موجودة');
  end if;

  if v_code.discount_percent < 100 then
    return jsonb_build_object(
      'success', true,
      'redeemed', false,
      'discount_percent', v_code.discount_percent
    );
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
      payment_method,
      discount_code_id
    )
    values (
      v_uid,
      p_course_id,
      'paid',
      0,
      'discount_code',
      v_code.id
    )
    returning id into v_enrollment_id;
  else
    update public.enrollments
    set payment_status = 'paid',
        amount_paid = 0,
        payment_method = 'discount_code',
        discount_code_id = v_code.id,
        enrolled_at = now()
    where id = v_enrollment_id;
  end if;

  update public.discount_codes
  set used_count = used_count + 1
  where id = v_code.id;

  return jsonb_build_object(
    'success', true,
    'redeemed', true,
    'discount_percent', 100,
    'enrollment_id', v_enrollment_id
  );
end;
$function$;

revoke all on function public.redeem_discount_code(text, uuid) from public, anon;
grant execute on function public.redeem_discount_code(text, uuid) to authenticated, service_role;

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
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'A provider transaction ID is required';
  end if;

  select pa.*
    into v_attempt
  from public.payment_attempts pa
  where pa.id = p_attempt_id
    and pa.provider = 'paymob'
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

  if v_attempt.discount_code_id is not null then
    select r.status
      into v_reservation_status
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
      enrolled_at = now()
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
    set status = 'redeemed',
        updated_at = now()
    where attempt_id = v_attempt.id
      and status = 'pending';

    if not found then
      raise exception 'Discount reservation could not be completed';
    end if;
  end if;

  already_paid := false;
  return next;
end;
$function$;

revoke all on function public.finalize_paymob_payment(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.finalize_paymob_payment(uuid, text, text, text) to service_role;
