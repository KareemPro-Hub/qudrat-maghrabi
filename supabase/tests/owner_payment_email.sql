begin;
create temporary table owner_payment_email_checks (check_name text) on commit drop;
do $test$
declare
  student uuid; course uuid; enrollment uuid; product text;
  attempt uuid:=gen_random_uuid(); failed_attempt uuid:=gen_random_uuid(); coupon_attempt uuid:=gen_random_uuid();
  apple_id uuid:=gen_random_uuid(); google_id uuid:=gen_random_uuid(); restore_id uuid:=gen_random_uuid();
  tx text:='codex-owner-qa-'||gen_random_uuid()::text;
  apple_tx text:='synthetic-apple-'||gen_random_uuid()::text;
  google_tx text:='synthetic-google-'||gen_random_uuid()::text;
  email_id uuid; token uuid; matched integer; email_row public.owner_payment_email_outbox%rowtype;
begin
  select e.student_id,e.course_id,e.id into student,course,enrollment
  from public.enrollments e join public.profiles p on p.id=e.student_id
  where p.role='student' and p.is_active=true limit 1;
  select product_id into product from public.store_subscription_plans where is_active=true limit 1;
  assert student is not null and product is not null,'Existing fixture parents unavailable';
  insert into public.payment_attempts(id,student_id,course_id,enrollment_id,provider,status,amount_minor,currency,provider_transaction_id)
  values(attempt,student,course,enrollment,'paymob','pending',12345,'EGP',tx);
  assert not exists(select 1 from public.owner_payment_email_outbox where event_key='paymob:'||tx),'Pending payment emailed';
  update public.payment_attempts set status='paid',paid_at=now() where id=attempt;
  select * into email_row from public.owner_payment_email_outbox where event_key='paymob:'||tx;
  assert email_row.id is not null,'Paid web transaction did not enqueue';
  assert email_row.amount_minor=12345 and email_row.currency='EGP','Actual amount/currency not preserved';
  email_id:=email_row.id;token:=email_row.dispatch_token;
  update public.payment_attempts set status='paid',updated_at=now() where id=attempt;
  select count(*) into matched from public.owner_payment_email_outbox where event_key='paymob:'||tx;
  assert matched=1,'Web notification duplicated';
  insert into owner_payment_email_checks values('web paid-only enqueue and duplicate suppression');

  insert into public.payment_attempts(id,student_id,course_id,enrollment_id,provider,status,amount_minor,currency,provider_transaction_id)
  values(failed_attempt,student,course,enrollment,'paymob','failed',12345,'EGP',tx||'-failed');
  assert not exists(select 1 from public.owner_payment_email_outbox where event_key='paymob:'||tx||'-failed'),'Failed payment emailed';
  insert into public.payment_attempts(id,student_id,course_id,enrollment_id,provider,status,amount_minor,currency,provider_transaction_id)
  values(coupon_attempt,student,course,enrollment,'coupon','paid',0,'SAR',tx||'-free');
  assert not exists(select 1 from public.owner_payment_email_outbox where event_key='paymob:'||tx||'-free'),'Free coupon emailed as paid';
  insert into owner_payment_email_checks values('failed and free payments excluded');

  insert into public.store_subscriptions(id,student_id,platform,product_id,original_transaction_id,latest_transaction_id,status,purchased_at,current_period_start,current_period_end,auto_renew)
  values(apple_id,student,'apple',product,apple_tx,apple_tx,'active',now(),now(),now()+interval '1 month',true);
  select count(*) into matched from public.owner_payment_email_outbox where event_key='apple:'||encode(sha256(convert_to(apple_tx,'UTF8')),'hex');
  assert matched=1,'Apple payment missing';
  update public.store_subscriptions set current_period_end=current_period_end+interval '1 day' where id=apple_id;
  select count(*) into matched from public.owner_payment_email_outbox where event_key='apple:'||encode(sha256(convert_to(apple_tx,'UTF8')),'hex');
  assert matched=1,'Apple re-verification duplicated';
  update public.store_subscriptions set latest_transaction_id=apple_tx||'-renewal',current_period_start=now() where id=apple_id;
  assert exists(select 1 from public.owner_payment_email_outbox where event_key='apple:'||encode(sha256(convert_to(apple_tx||'-renewal','UTF8')),'hex')),'Renewal missing';
  insert into owner_payment_email_checks values('Apple new transaction, duplicate and renewal');

  insert into public.store_subscriptions(id,student_id,platform,product_id,original_transaction_id,latest_transaction_id,status,purchased_at,current_period_start,current_period_end,auto_renew)
  values(google_id,student,'google',product,google_tx,google_tx,'cancelled',now(),now(),now()+interval '1 month',false);
  select * into email_row from public.owner_payment_email_outbox where event_key='google:'||encode(sha256(convert_to(google_tx,'UTF8')),'hex');
  assert email_row.id is not null,'Paid Google subscription without auto-renew missing';
  assert email_row.amount_minor is null and email_row.currency is null,'Invented store amount';
  assert position(google_tx in email_row.event_key)=0,'Purchase token leaked';
  insert into owner_payment_email_checks values('Google nonrenewing payment and safe identifiers');

  insert into public.store_subscriptions(id,student_id,platform,product_id,original_transaction_id,latest_transaction_id,status,purchased_at,current_period_start,current_period_end,auto_renew)
  values(restore_id,student,'apple',product,apple_tx||'-old',apple_tx||'-old','active',now()-interval '1 month',now()-interval '1 month',now()+interval '1 day',true);
  assert not exists(select 1 from public.owner_payment_email_outbox where event_key='apple:'||encode(sha256(convert_to(apple_tx||'-old','UTF8')),'hex')),'Old restore treated as new payment';
  update public.store_subscriptions set status='revoked',latest_transaction_id=google_tx||'-revoked' where id=google_id;
  assert not exists(select 1 from public.owner_payment_email_outbox where event_key='google:'||encode(sha256(convert_to(google_tx||'-revoked','UTF8')),'hex')),'Revocation treated as payment';
  insert into owner_payment_email_checks values('restored old and revoked purchases excluded');

  select count(*) into matched from public.claim_owner_payment_email(email_id,token);
  assert matched=1,'First claim failed';
  select count(*) into matched from public.claim_owner_payment_email(email_id,token);
  assert matched=0,'Concurrent claim succeeded';
  perform public.fail_owner_payment_email(email_id,'SYNTHETIC_TEST_ERROR');
  assert exists(select 1 from public.owner_payment_email_outbox where id=email_id and status='pending' and attempts=1 and next_attempt_at>now()),'Failed delivery not retryable';
  update public.owner_payment_email_outbox set next_attempt_at=now()-interval '1 second' where id=email_id;
  select count(*) into matched from public.claim_owner_payment_email(email_id,token);
  assert matched=1,'Retry claim failed';
  update public.owner_payment_email_outbox set attempts=8,locked_until=now()-interval '1 second' where id=email_id;
  perform private.dispatch_owner_payment_emails(email_id);
  assert exists(select 1 from public.owner_payment_email_outbox where id=email_id and status='failed'),'Attempt bound not enforced';
  insert into owner_payment_email_checks values('atomic leases, retry delay and bounded attempts');

  assert not has_table_privilege('anon','public.owner_payment_email_outbox','SELECT'),'Anonymous outbox exposure';
  assert not has_table_privilege('authenticated','public.owner_payment_email_outbox','SELECT'),'Student outbox exposure';
  assert not has_function_privilege('authenticated','public.claim_owner_payment_email(uuid,uuid)','EXECUTE'),'Student claim exposure';
  assert not has_function_privilege('anon','public.fail_owner_payment_email(uuid,text)','EXECUTE'),'Anonymous mutation exposure';
  assert (select relrowsecurity from pg_class where oid='public.owner_payment_email_outbox'::regclass),'RLS missing';
  insert into owner_payment_email_checks values('RLS and narrow grants');
end;
$test$;
select json_build_object('passed',true,'checks',json_agg(check_name),'outbound_requests','Rolled back before pg_net can send','production_payments_changed',false) as verification from owner_payment_email_checks;
rollback;
