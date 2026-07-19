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
set search_path = public, pg_temp
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
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

  update public.payment_attempts
    set status = 'paid',
        provider_transaction_id = p_transaction_id,
        provider_order_id = coalesce(p_order_id, provider_order_id),
        payment_method = coalesce(nullif(btrim(p_method), ''), 'paymob'),
        failure_reason = null,
        paid_at = now()
    where id = v_attempt.id;

  update public.enrollments
    set payment_status = 'paid',
        payment_method = 'paymob',
        payment_reference = p_transaction_id,
        amount_paid = v_attempt.amount_minor / 100.0,
        enrolled_at = now()
    where id = v_attempt.enrollment_id
      and student_id = v_attempt.student_id
      and course_id = v_attempt.course_id;

  if not found then
    raise exception 'Enrollment linked to payment attempt was not found';
  end if;

  already_paid := false;
  return next;
end;
$function$;

revoke all on function public.finalize_paymob_payment(uuid, text, text, text) from public;
revoke all on function public.finalize_paymob_payment(uuid, text, text, text) from anon;
revoke all on function public.finalize_paymob_payment(uuid, text, text, text) from authenticated;
grant execute on function public.finalize_paymob_payment(uuid, text, text, text) to service_role;

comment on function public.finalize_paymob_payment(uuid, text, text, text) is
  'Atomically marks a verified Paymob payment and its enrollment as paid. Server service role only.';
