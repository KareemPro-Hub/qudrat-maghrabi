-- Secure parent/student linking:
-- the student creates a short-lived, one-time code and shares it with a parent.
-- Raw codes are never stored; only a SHA-256 hash is persisted.

create schema if not exists private;

revoke all on schema private from public, anon;

create table private.parent_link_codes (
  id uuid primary key default extensions.uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  code_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table private.parent_link_codes enable row level security;

revoke all on table private.parent_link_codes from public, anon, authenticated;

create index parent_link_codes_student_id_idx
  on private.parent_link_codes (student_id);

create index parent_link_codes_expires_at_idx
  on private.parent_link_codes (expires_at);

create or replace function private.create_parent_link_code_for_current_user()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  raw_code text;
  formatted_code text;
  code_expiry timestamptz := now() + interval '15 minutes';
begin
  if caller_id is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = caller_id
      and profile.role = 'student'
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'student_only';
  end if;

  delete from private.parent_link_codes link_code
  where link_code.student_id = caller_id
     or link_code.expires_at <= now()
     or link_code.used_at is not null;

  raw_code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  formatted_code :=
    substring(raw_code from 1 for 4) || '-' ||
    substring(raw_code from 5 for 4) || '-' ||
    substring(raw_code from 9 for 4) || '-' ||
    substring(raw_code from 13 for 4);

  insert into private.parent_link_codes (
    student_id,
    code_hash,
    expires_at
  )
  values (
    caller_id,
    extensions.digest(raw_code, 'sha256'),
    code_expiry
  );

  return query select formatted_code, code_expiry;
end;
$$;

create or replace function private.link_student_by_code_for_current_user(
  link_code text
)
returns table (student_id uuid, student_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_code text;
  matched_code private.parent_link_codes%rowtype;
begin
  if caller_id is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = caller_id
      and profile.role = 'parent'
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'parent_only';
  end if;

  normalized_code := upper(
    regexp_replace(coalesce(link_code, ''), '[^0-9A-F]', '', 'g')
  );

  if length(normalized_code) <> 16 then
    raise exception 'link_code_invalid_or_expired';
  end if;

  select stored_code.*
  into matched_code
  from private.parent_link_codes stored_code
  where stored_code.code_hash = extensions.digest(normalized_code, 'sha256')
    and stored_code.used_at is null
    and stored_code.expires_at > now()
  for update;

  if not found then
    raise exception 'link_code_invalid_or_expired';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = matched_code.student_id
      and profile.role = 'student'
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'student_unavailable';
  end if;

  update private.parent_link_codes
  set used_at = now()
  where id = matched_code.id;

  insert into public.parent_student (parent_id, student_id)
  values (caller_id, matched_code.student_id)
  on conflict (parent_id, student_id) do nothing;

  return query
  select profile.id, profile.full_name
  from public.profiles profile
  where profile.id = matched_code.student_id;
end;
$$;

revoke all on function private.create_parent_link_code_for_current_user()
  from public, anon;
revoke all on function private.link_student_by_code_for_current_user(text)
  from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.create_parent_link_code_for_current_user()
  to authenticated;
grant execute on function private.link_student_by_code_for_current_user(text)
  to authenticated;

create or replace function public.create_parent_link_code()
returns table (code text, expires_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.create_parent_link_code_for_current_user();
$$;

create or replace function public.link_student_by_code(link_code text)
returns table (student_id uuid, student_name text)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.link_student_by_code_for_current_user(link_code);
$$;

revoke all on function public.create_parent_link_code()
  from public, anon;
revoke all on function public.link_student_by_code(text)
  from public, anon;

grant execute on function public.create_parent_link_code()
  to authenticated;
grant execute on function public.link_student_by_code(text)
  to authenticated;
