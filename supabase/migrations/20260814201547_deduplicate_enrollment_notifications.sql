-- Create the enrollment notification only when access first becomes paid.
-- Store purchase verification can update the same paid enrollment repeatedly.
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
      'تم تفعيل اشتراكك بنجاح! 🎉',
      'يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم',
      'enrollment'
    );
  end if;

  return new;
end;
$function$;

revoke execute on function public.notify_enrollment()
  from public, anon, authenticated;

-- Keep the newest activation notice and remove only exact historical copies.
with ranked_notifications as (
  select
    id,
    row_number() over (
      partition by user_id, title, body, type
      order by created_at desc, id desc
    ) as duplicate_rank
  from public.notifications
  where type = 'enrollment'
    and title = 'تم تفعيل اشتراكك بنجاح! 🎉'
    and body = 'يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم'
)
delete from public.notifications as notifications
using ranked_notifications
where notifications.id = ranked_notifications.id
  and ranked_notifications.duplicate_rank > 1;
