-- Standardize Arabic punctuation spacing in enrollment notifications.
create or replace function public.notify_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  should_notify boolean := false;
begin
  if tg_op = 'INSERT' then
    should_notify := true;
  elsif tg_op = 'UPDATE' then
    should_notify := old.payment_status is distinct from 'paid';
  end if;

  if new.payment_status = 'paid' and should_notify then
    insert into public.notifications (user_id, title, body, type)
    values (
      new.student_id,
      'تم تفعيل اشتراكك بنجاح ! 🎉',
      'يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم',
      'enrollment'
    );
  end if;

  return new;
end;
$function$;

revoke execute on function public.notify_enrollment()
  from public, anon, authenticated;

update public.notifications
set title = 'تم تفعيل اشتراكك بنجاح ! 🎉'
where type = 'enrollment'
  and title = 'تم تفعيل اشتراكك بنجاح! 🎉';
