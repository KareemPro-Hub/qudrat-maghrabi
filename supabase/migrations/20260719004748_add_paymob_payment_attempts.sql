create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  provider text not null default 'paymob',
  status text not null default 'pending'
    constraint payment_attempts_status_check check (status in ('pending', 'paid', 'failed')),
  amount_minor bigint not null
    constraint payment_attempts_amount_minor_check check (amount_minor > 0),
  currency text not null,
  provider_intention_id text,
  provider_transaction_id text,
  provider_order_id text,
  payment_method text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_attempts_provider_transaction_unique
  on public.payment_attempts (provider, provider_transaction_id)
  where provider_transaction_id is not null;

create index payment_attempts_student_created_idx
  on public.payment_attempts (student_id, created_at desc);

create index payment_attempts_enrollment_idx
  on public.payment_attempts (enrollment_id);

create index payment_attempts_provider_order_idx
  on public.payment_attempts (provider, provider_order_id)
  where provider_order_id is not null;

alter table public.payment_attempts enable row level security;

create policy payment_attempts_select
  on public.payment_attempts
  for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or public.auth_role() in ('admin', 'teacher', 'student_manager')
  );

grant select on public.payment_attempts to authenticated;
revoke all on public.payment_attempts from anon;

create trigger payment_attempts_updated_at
  before update on public.payment_attempts
  for each row execute function public.update_updated_at();

comment on table public.payment_attempts is
  'Server-owned audit trail for Paymob payment attempts. Client users have read-only access to their own rows.';
