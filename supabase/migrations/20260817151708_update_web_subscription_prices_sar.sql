update public.store_subscription_plans
set web_price_minor = case plan_code
      when 'monthly' then 7900
      when 'quarterly' then 19900
      when 'semiannual' then 29900
      else web_price_minor
    end,
    web_currency = 'SAR'
where plan_code in ('monthly', 'quarterly', 'semiannual');
