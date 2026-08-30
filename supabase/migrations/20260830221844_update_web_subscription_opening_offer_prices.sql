update public.store_subscription_plans
set web_price_minor = case plan_code
      when 'monthly' then 1900
      when 'quarterly' then 3900
      when 'semiannual' then 5900
      else web_price_minor
    end,
    updated_at = now()
where plan_code in ('monthly', 'quarterly', 'semiannual');
