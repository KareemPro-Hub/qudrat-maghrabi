update public.store_subscription_plans
set web_price_minor = case plan_code
      when 'monthly' then 4999
      when 'quarterly' then 9999
      when 'semiannual' then 17999
      else web_price_minor
    end,
    web_currency = 'SAR',
    updated_at = now()
where plan_code in ('monthly', 'quarterly', 'semiannual');
