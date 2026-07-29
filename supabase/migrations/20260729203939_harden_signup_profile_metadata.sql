create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'مستخدم جديد'),
    new.email,
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    case
      when new.raw_user_meta_data->>'role' in ('student', 'parent')
        then new.raw_user_meta_data->>'role'
      else 'student'
    end
  );
  return new;
end;
$function$;
