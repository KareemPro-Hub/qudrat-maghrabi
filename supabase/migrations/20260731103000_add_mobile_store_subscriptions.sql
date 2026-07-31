create extension if not exists pg_cron;

create table if not exists public.store_subscription_plans (
  product_id text primary key,
  plan_code text not null unique,
  name_ar text not null,
  duration_months integer not null check (duration_months in (1, 3, 6)),
  bundle_course_id uuid not null references public.courses(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_subscription_plans enable row level security;

drop policy if exists "Authenticated users can read active store plans"
  on public.store_subscription_plans;
create policy "Authenticated users can read active store plans"
  on public.store_subscription_plans
  for select
  to authenticated
  using (is_active = true);

insert into public.store_subscription_plans (
  product_id,
  plan_code,
  name_ar,
  duration_months,
  bundle_course_id
)
select values_to_insert.product_id,
       values_to_insert.plan_code,
       values_to_insert.name_ar,
       values_to_insert.duration_months,
       bundle.id
from (
  values
    ('com.qudratmaghrabi.app.subscription.monthly', 'monthly', 'الباقة الأساسية', 1),
    ('com.qudratmaghrabi.app.subscription.quarterly', 'quarterly', 'الباقة المميزة', 3),
    ('com.qudratmaghrabi.app.subscription.semiannual', 'semiannual', 'الباقة الاحترافية', 6)
) as values_to_insert(product_id, plan_code, name_ar, duration_months)
cross join lateral (
  select id
  from public.courses
  where parent_course_id is null
    and title = 'دورة القدرات 2027'
  order by created_at asc
  limit 1
) as bundle
on conflict (product_id) do update
set plan_code = excluded.plan_code,
    name_ar = excluded.name_ar,
    duration_months = excluded.duration_months,
    bundle_course_id = excluded.bundle_course_id,
    is_active = true,
    updated_at = now();

do $$
begin
  if not exists (
    select 1
    from public.store_subscription_plans
    where product_id = 'com.qudratmaghrabi.app.subscription.monthly'
  ) then
    raise exception 'The platform bundle course was not found; store plans were not configured';
  end if;
end;
$$;

create table if not exists public.store_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  product_id text not null references public.store_subscription_plans(product_id) on delete restrict,
  original_transaction_id text not null,
  latest_transaction_id text not null,
  status text not null check (status in ('active', 'grace', 'cancelled', 'expired', 'revoked', 'paused', 'pending')),
  purchased_at timestamptz not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  auto_renew boolean not null default true,
  renewal_reminder_sent_for timestamptz,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, original_transaction_id),
  check (current_period_end >= current_period_start)
);

create index if not exists store_subscriptions_student_status_idx
  on public.store_subscriptions(student_id, status, current_period_end desc);
create index if not exists store_subscriptions_renewal_due_idx
  on public.store_subscriptions(current_period_end)
  where auto_renew = true and status in ('active', 'grace');

alter table public.store_subscriptions enable row level security;

drop policy if exists "Students can read their own store subscriptions"
  on public.store_subscriptions;
create policy "Students can read their own store subscriptions"
  on public.store_subscriptions
  for select
  to authenticated
  using (student_id = (select auth.uid()));

create table if not exists public.store_purchase_events (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('apple', 'google')),
  event_type text not null,
  external_event_id text,
  original_transaction_id text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists store_purchase_events_external_id_unique
  on public.store_purchase_events(platform, external_event_id)
  where external_event_id is not null;

alter table public.store_purchase_events enable row level security;
revoke all on public.store_purchase_events from anon, authenticated;
revoke all on sequence public.store_purchase_events_id_seq from anon, authenticated;

create or replace function public.record_verified_store_subscription(
  p_student_id uuid,
  p_platform text,
  p_product_id text,
  p_original_transaction_id text,
  p_latest_transaction_id text,
  p_status text,
  p_purchased_at timestamptz,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_auto_renew boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.store_subscription_plans%rowtype;
  v_existing_student uuid;
  v_subscription_id uuid;
begin
  if p_platform not in ('apple', 'google') then
    raise exception 'Unsupported store platform';
  end if;
  if p_status not in ('active', 'grace', 'cancelled', 'expired', 'revoked', 'paused', 'pending') then
    raise exception 'Unsupported subscription status';
  end if;
  if nullif(trim(p_original_transaction_id), '') is null
     or nullif(trim(p_latest_transaction_id), '') is null then
    raise exception 'Missing store transaction identifier';
  end if;
  if p_period_end < p_period_start then
    raise exception 'Invalid subscription period';
  end if;
  if not exists (
    select 1
    from public.profiles
    where id = p_student_id and role = 'student' and is_active = true
  ) then
    raise exception 'A valid student account is required';
  end if;

  select * into v_plan
  from public.store_subscription_plans
  where product_id = p_product_id and is_active = true;
  if not found then
    raise exception 'Unknown or inactive store product';
  end if;

  select student_id into v_existing_student
  from public.store_subscriptions
  where platform = p_platform
    and original_transaction_id = p_original_transaction_id;
  if v_existing_student is not null and v_existing_student <> p_student_id then
    raise exception 'This store purchase is already linked to another account';
  end if;

  insert into public.store_subscriptions (
    student_id,
    platform,
    product_id,
    original_transaction_id,
    latest_transaction_id,
    status,
    purchased_at,
    current_period_start,
    current_period_end,
    auto_renew,
    renewal_reminder_sent_for,
    last_verified_at,
    updated_at
  ) values (
    p_student_id,
    p_platform,
    p_product_id,
    p_original_transaction_id,
    p_latest_transaction_id,
    p_status,
    p_purchased_at,
    p_period_start,
    p_period_end,
    p_auto_renew,
    null,
    now(),
    now()
  )
  on conflict (platform, original_transaction_id) do update
  set product_id = excluded.product_id,
      latest_transaction_id = excluded.latest_transaction_id,
      status = excluded.status,
      purchased_at = least(public.store_subscriptions.purchased_at, excluded.purchased_at),
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      auto_renew = excluded.auto_renew,
      renewal_reminder_sent_for = case
        when public.store_subscriptions.current_period_end is distinct from excluded.current_period_end
          then null
        else public.store_subscriptions.renewal_reminder_sent_for
      end,
      last_verified_at = now(),
      updated_at = now()
  returning id into v_subscription_id;

  insert into public.enrollments (
    student_id,
    course_id,
    payment_status,
    payment_method,
    payment_reference,
    amount_paid,
    enrolled_at,
    expires_at
  ) values (
    p_student_id,
    v_plan.bundle_course_id,
    'paid',
    case when p_platform = 'apple' then 'app_store' else 'google_play' end,
    p_original_transaction_id,
    null,
    p_purchased_at,
    case
      when p_status in ('expired', 'revoked', 'paused', 'pending') then least(p_period_end, now())
      else p_period_end
    end
  )
  on conflict (student_id, course_id) do update
  set payment_status = 'paid',
      payment_method = excluded.payment_method,
      payment_reference = excluded.payment_reference,
      amount_paid = excluded.amount_paid,
      enrolled_at = least(public.enrollments.enrolled_at, excluded.enrolled_at),
      expires_at = excluded.expires_at;

  return v_subscription_id;
end;
$$;

revoke all on function public.record_verified_store_subscription(
  uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.record_verified_store_subscription(
  uuid, text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean
) to service_role;

create or replace function public.enqueue_store_renewal_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    update public.store_subscriptions
    set renewal_reminder_sent_for = current_period_end,
        updated_at = now()
    where auto_renew = true
      and status in ('active', 'grace')
      and current_period_end > now()
      and current_period_end <= now() + interval '3 days'
      and renewal_reminder_sent_for is distinct from current_period_end
    returning student_id, current_period_end
  ), inserted as (
    insert into public.notifications (user_id, title, body, type)
    select student_id,
           'تذكير بتجديد اشتراكك',
           'سيُجدّد اشتراكك تلقائيًا خلال 3 أيام. يمكنك إدارة التجديد أو إلغاؤه من متجر التطبيقات.',
           'payment'
    from due
    returning id
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function public.enqueue_store_renewal_reminders()
  from public, anon, authenticated;
grant execute on function public.enqueue_store_renewal_reminders()
  to service_role;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'store-renewal-reminders'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'store-renewal-reminders',
  '0 7 * * *',
  'select public.enqueue_store_renewal_reminders();'
);
