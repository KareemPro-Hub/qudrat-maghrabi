update public.courses
set currency = 'EGP'
where currency is distinct from 'EGP';

alter table public.courses
  alter column currency set default 'EGP';
