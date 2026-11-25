-- 26 Nov 2026: GRAAS is open to members worldwide.
--  * Every profile has a country (India unless the member chooses another). State becomes "state or region".
--  * Phone numbers: Indian mobiles stay as 10 digits; numbers from other countries are kept with their country code
--    (11 to 15 digits, no plus sign). Every function that checks a phone number accepts both.
--  * WhatsApp adds India's 91 only to 10-digit Indian mobiles.

alter table public.profiles add column if not exists country text not null default 'India';
alter table public.profiles add constraint profiles_country_check check (char_length(country) between 2 and 60) not valid;
alter table public.profiles validate constraint profiles_country_check;

create or replace function private.wa_to(p_phone text)
returns text language sql immutable set search_path = '' as $$
  select case when p_phone ~ '^[6-9][0-9]{9}$' then '91' || p_phone else p_phone end
$$;

do $do$
declare r record; d text;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'private') and p.prosrc like '%^[6-9][0-9]{9}$%' and p.proname <> 'wa_to' loop
    d := pg_get_functiondef(r.oid);
    d := replace(d, '^[6-9][0-9]{9}$', '^([6-9][0-9]{9}|[1-9][0-9]{10,14})$');
    d := replace(d, 'Enter a 10-digit Indian mobile number.', 'Enter a 10-digit Indian mobile number, or a number from another country with its country code.');
    d := replace(d, '10-digit mobile number.', 'mobile number (10 digits in India, or with the country code).');
    execute d;
  end loop;
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and p.proname = 'enqueue' loop
    d := pg_get_functiondef(r.oid);
    d := replace(d, '''91'' || p.phone', 'private.wa_to(p.phone)');
    execute d;
  end loop;
end $do$;

create or replace function public.member_set_country(p_country text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v text := left(trim(coalesce(p_country, '')), 60);
begin
  if (select auth.uid()) is null then return private.err(null, 'Please sign in again.'); end if;
  if v !~ '^[A-Za-z][A-Za-z .,''()&-]{1,59}$' then return private.err('country', 'Choose your country.'); end if;
  update public.profiles set country = v, updated_at = now() where id = (select auth.uid());
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.member_set_country(text) from public, anon;
grant execute on function public.member_set_country(text) to authenticated;
