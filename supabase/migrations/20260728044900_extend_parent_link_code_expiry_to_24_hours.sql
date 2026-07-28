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
  code_expiry timestamptz := now() + interval '1 day';
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

revoke all on function private.create_parent_link_code_for_current_user()
  from public, anon;
grant execute on function private.create_parent_link_code_for_current_user()
  to authenticated;
