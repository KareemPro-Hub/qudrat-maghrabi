create index if not exists store_subscription_plans_bundle_course_idx
  on public.store_subscription_plans(bundle_course_id);

create index if not exists store_subscriptions_product_idx
  on public.store_subscriptions(product_id);

drop policy if exists "Store purchase events are service only"
  on public.store_purchase_events;
create policy "Store purchase events are service only"
  on public.store_purchase_events
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);
