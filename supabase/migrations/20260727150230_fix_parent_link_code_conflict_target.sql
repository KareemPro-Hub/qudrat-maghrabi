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
  on conflict on constraint parent_student_parent_id_student_id_key
  do nothing;

  return query
  select profile.id, profile.full_name
  from public.profiles profile
  where profile.id = matched_code.student_id;
end;
$$;

revoke all on function private.link_student_by_code_for_current_user(text)
  from public, anon;
grant execute on function private.link_student_by_code_for_current_user(text)
  to authenticated;
