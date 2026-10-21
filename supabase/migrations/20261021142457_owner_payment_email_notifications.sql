create extension if not exists pg_net;

create table public.owner_payment_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  dispatch_token uuid not null default gen_random_uuid(),
  source text not null check (source in ('paymob', 'apple', 'google')),
  student_name text not null default '',
  student_email text not null default '',
  course_name text not null default '',
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  currency text,
  paid_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_dispatched_at timestamptz,
  provider_email_id text,
  delivery_event text,
  sent_at timestamptz,
  last_error text,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.owner_payment_email_outbox enable row level security;
revoke all on public.owner_payment_email_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.owner_payment_email_outbox to service_role;
create index owner_payment_email_due_idx on public.owner_payment_email_outbox(next_attempt_at)
where status in ('pending','processing');

create or replace function public.claim_owner_payment_email(p_id uuid, p_token uuid)
returns setof public.owner_payment_email_outbox
language sql security invoker set search_path = '' as $function$
  update public.owner_payment_email_outbox
  set status='processing', attempts=attempts+1,
      first_attempt_at=coalesce(first_attempt_at,now()), locked_until=now()+interval '2 minutes'
  where id=p_id and dispatch_token=p_token and attempts<8
    and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
    and ((status='pending' and next_attempt_at<=now()) or (status='processing' and locked_until<now()))
  returning *;
$function$;
revoke all on function public.claim_owner_payment_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_owner_payment_email(uuid,uuid) to service_role;

create or replace function public.fail_owner_payment_email(p_id uuid,p_reason text)
returns void language sql security invoker set search_path = '' as $function$
  update public.owner_payment_email_outbox
  set status=case when attempts>=8 or first_attempt_at<=now()-interval '23 hours' then 'failed' else 'pending' end,
      next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,greatest(0,attempts-1)))::integer),
      locked_until=null, last_error=left(p_reason,100)
  where id=p_id and status='processing';
$function$;
revoke all on function public.fail_owner_payment_email(uuid,text) from public,anon,authenticated;
grant execute on function public.fail_owner_payment_email(uuid,text) to service_role;

create or replace function private.dispatch_owner_payment_emails(p_id uuid default null)
returns integer language plpgsql security definer set search_path = '' as $function$
declare item record; dispatched integer:=0;
begin
  -- Stop before Resend's 24-hour idempotency retention ends, even after an outage.
  update public.owner_payment_email_outbox set status='failed', last_error='RETRY_WINDOW_EXPIRED',locked_until=null
  where status in ('pending','processing') and
    (first_attempt_at<=now()-interval '23 hours' or (attempts>=8 and coalesce(locked_until,now())<=now()));
  for item in
    select id,dispatch_token from public.owner_payment_email_outbox
    where (p_id is null or id=p_id) and attempts<8
      and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
      and ((status='pending' and next_attempt_at<=now()) or (status='processing' and locked_until<now()))
      and (last_dispatched_at is null or last_dispatched_at<now()-interval '1 minute')
    order by created_at limit 20 for update skip locked
  loop
    begin
      perform net.http_post(
        url:='https://www.qudratmaghrabi.com/api/notify-owner-payment',
        headers:=jsonb_build_object('Content-Type','application/json'),
        body:=jsonb_build_object('notification_id',item.id,'token',item.dispatch_token),
        timeout_milliseconds:=25000);
      update public.owner_payment_email_outbox set last_dispatched_at=now() where id=item.id;
      dispatched:=dispatched+1;
    exception when others then
      raise warning 'Owner payment email dispatch deferred [%]',SQLSTATE;
    end;
  end loop;
  return dispatched;
end;
$function$;
revoke all on function private.dispatch_owner_payment_emails(uuid) from public,anon,authenticated;
grant execute on function private.dispatch_owner_payment_emails(uuid) to service_role;

create or replace function private.enqueue_owner_payment_email()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  event_key_value text; source_value text; student_id_value uuid; course_id_value uuid;
  amount_value bigint; currency_value text; paid_at_value timestamptz; new_id uuid;
  student_name_value text; student_email_value text; course_name_value text;
begin
  if tg_table_name='payment_attempts' then
    if new.provider<>'paymob' or new.status<>'paid' or new.amount_minor<=0 or nullif(new.provider_transaction_id,'') is null then return new; end if;
    if tg_op='UPDATE' and old.status='paid' and old.provider_transaction_id is not distinct from new.provider_transaction_id then return new; end if;
    source_value:='paymob'; event_key_value:='paymob:'||new.provider_transaction_id;
    student_id_value:=new.student_id; course_id_value:=new.course_id;
    amount_value:=new.amount_minor; currency_value:=new.currency; paid_at_value:=coalesce(new.paid_at,now());
  else
    if new.status not in ('active','cancelled') or new.current_period_end<=now() or nullif(new.latest_transaction_id,'') is null then return new; end if;
    -- Restoring an older purchase is not a new payment notification.
    if new.current_period_start<TG_ARGV[0]::timestamptz then return new; end if;
    source_value:=new.platform;
    -- Some Google fallback identifiers are purchase tokens; never email those secrets.
    event_key_value:=new.platform||':'||encode(sha256(convert_to(new.latest_transaction_id,'UTF8')),'hex');
    student_id_value:=new.student_id; paid_at_value:=new.current_period_start;
    select bundle_course_id,name_ar into course_id_value,course_name_value
    from public.store_subscription_plans where product_id=new.product_id;
  end if;
  select full_name,email into student_name_value,student_email_value from public.profiles where id=student_id_value;
  if nullif(course_name_value,'') is null then
    select title into course_name_value from public.courses where id=course_id_value;
  end if;
  insert into public.owner_payment_email_outbox(event_key,source,student_name,student_email,course_name,amount_minor,currency,paid_at)
  values(event_key_value,source_value,coalesce(student_name_value,''),coalesce(student_email_value,''),coalesce(course_name_value,'اشتراك المنصة'),amount_value,currency_value,paid_at_value)
  on conflict(event_key) do nothing returning id into new_id;
  if new_id is not null then perform private.dispatch_owner_payment_emails(new_id); end if;
  return new;
exception when others then
  -- An email-side problem must never roll back a confirmed payment or entitlement.
  raise warning 'Owner payment email enqueue failed [%]',SQLSTATE;
  return new;
end;
$function$;
revoke all on function private.enqueue_owner_payment_email() from public,anon,authenticated;

create trigger owner_email_after_web_payment
  after insert or update on public.payment_attempts
  for each row execute function private.enqueue_owner_payment_email();

do $block$
begin
  execute format('create trigger owner_email_after_store_payment after insert or update on public.store_subscriptions for each row execute function private.enqueue_owner_payment_email(%L)',now()::text);
end;
$block$;

select cron.schedule('owner-payment-email-retries','* * * * *',
  $cron$select private.dispatch_owner_payment_emails();$cron$);
