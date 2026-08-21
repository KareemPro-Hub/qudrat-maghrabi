-- New public registrations are students only and must include a valid phone.
-- Existing parent accounts and historical links are intentionally preserved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_phone text := nullif(btrim(new.raw_user_meta_data ->> 'phone'), '');
begin
  if normalized_phone is null
     or normalized_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'valid_phone_required';
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    normalized_phone,
    'student'
  );

  return new;
end;
$$;
