-- GRAAS portal · foundation
-- Staff roles, admin-managed membership plans, site settings, pre-registration leads, audit log.
-- Every public table has row-level security. Internal helpers live in the non-exposed "private" schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create type public.staff_role as enum (
  'super_admin','membership_desk','chapter_manager','event_manager','finance',
  'communications','support','regional_coordinator','moderator');
create type public.plan_audience as enum ('student','professional','institution','industry');
create type public.lead_kind as enum ('student','professional','faculty','college','school','industry','parent','other');

-- People ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null,
  scope jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table public.staff_members enable row level security;

create or replace function private.is_staff(roles public.staff_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_members s
    where s.user_id = (select auth.uid()) and s.is_active
      and (roles is null or s.role = 'super_admin' or s.role = any(roles)));
$$;
revoke all on function private.is_staff(public.staff_role[]) from public;
grant execute on function private.is_staff(public.staff_role[]) to anon, authenticated, service_role;

create policy profiles_select on public.profiles for select to authenticated
  using ((select auth.uid()) = id or private.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy staff_select on public.staff_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff(array['super_admin']::public.staff_role[]));
create policy staff_insert on public.staff_members for insert to authenticated
  with check (private.is_staff(array['super_admin']::public.staff_role[]));
create policy staff_update on public.staff_members for update to authenticated
  using (private.is_staff(array['super_admin']::public.staff_role[]))
  with check (private.is_staff(array['super_admin']::public.staff_role[]));
create policy staff_delete on public.staff_members for delete to authenticated
  using (private.is_staff(array['super_admin']::public.staff_role[]));

-- First admins are invited by email; the role is granted only once the email is confirmed.
create table private.admin_invites (
  email text primary key,
  role public.staff_role not null default 'super_admin',
  created_at timestamptz not null default now()
);
create table private.app_secrets (key text primary key, value text not null);

create or replace function private.handle_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update set email = excluded.email;
  if new.email_confirmed_at is not null then
    insert into public.staff_members (user_id, role)
    select new.id, i.role from private.admin_invites i where lower(i.email) = lower(new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_changed after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.handle_auth_user();

-- Audit log ------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_select on public.audit_log for select to authenticated
  using (private.is_staff(array['super_admin']::public.staff_role[]));

create or replace function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values ((select auth.uid()), lower(tg_op), tg_table_name,
          coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'key', to_jsonb(old)->>'key'),
          jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return coalesce(new, old);
end $$;

-- Membership plans: prices are set by admins, never in code ---------------
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]+$'),
  audience public.plan_audience not null,
  name text not null,
  tagline text,
  duration_months int check (duration_months is null or duration_months > 0),
  price_inr numeric(10,2) check (price_inr is null or price_inr >= 0),
  gst_percent numeric(5,2) not null default 0 check (gst_percent between 0 and 28),
  benefits jsonb not null default '[]'::jsonb,
  requires_approval boolean not null default false,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.membership_plans enable row level security;
create trigger plans_updated before update on public.membership_plans
  for each row execute function public.set_updated_at();
create trigger plans_audit after insert or update or delete on public.membership_plans
  for each row execute function private.audit_row();

create policy plans_select on public.membership_plans for select to anon, authenticated
  using (is_published or private.is_staff());
create policy plans_insert on public.membership_plans for insert to authenticated
  with check (private.is_staff(array['finance']::public.staff_role[]));
create policy plans_update on public.membership_plans for update to authenticated
  using (private.is_staff(array['finance']::public.staff_role[]))
  with check (private.is_staff(array['finance']::public.staff_role[]));
create policy plans_delete on public.membership_plans for delete to authenticated
  using (private.is_staff(array['super_admin']::public.staff_role[]));

-- Site settings ----------------------------------------------------------
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.site_settings enable row level security;
create trigger settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger settings_audit after insert or update or delete on public.site_settings
  for each row execute function private.audit_row();
create policy settings_select on public.site_settings for select to anon, authenticated
  using (is_public or private.is_staff());
create policy settings_insert on public.site_settings for insert to authenticated
  with check (private.is_staff(array['super_admin']::public.staff_role[]));
create policy settings_update on public.site_settings for update to authenticated
  using (private.is_staff(array['super_admin']::public.staff_role[]))
  with check (private.is_staff(array['super_admin']::public.staff_role[]));

-- Pre-registration leads --------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  serial bigint generated always as identity unique,
  kind public.lead_kind not null,
  full_name text not null,
  phone text not null unique,
  email text,
  organisation text,
  city text,
  interests text[] not null default '{}',
  message text,
  is_adult boolean not null,
  consent_contact boolean not null,
  consent_at timestamptz not null default now(),
  source text,
  utm jsonb,
  referred_by text,
  my_code text not null unique,
  status text not null default 'new',
  owner uuid references auth.users(id),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create index leads_created_idx on public.leads (created_at desc);
create index leads_ip_idx on public.leads (ip_hash, created_at);
create index leads_owner_idx on public.leads (owner);
create trigger leads_updated before update on public.leads
  for each row execute function public.set_updated_at();
create policy leads_select on public.leads for select to authenticated
  using (private.is_staff(array['support','communications','membership_desk','chapter_manager','regional_coordinator']::public.staff_role[]));
create policy leads_update on public.leads for update to authenticated
  using (private.is_staff(array['support','communications','membership_desk']::public.staff_role[]))
  with check (private.is_staff(array['support','communications','membership_desk']::public.staff_role[]));

-- The website server is the only caller: it must present the shared token.
create or replace function public.submit_lead(p_token text, p_data jsonb, p_ip_hash text default null, p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_phone text := regexp_replace(coalesce(p_data->>'phone',''), '\D', '', 'g');
  v_name text := btrim(coalesce(p_data->>'full_name',''));
  v_email text := nullif(lower(btrim(coalesce(p_data->>'email',''))), '');
  v_kind public.lead_kind;
  v_row public.leads;
  v_recent int;
begin
  select value into v_secret from private.app_secrets where key = 'lead_token';
  if v_secret is null or p_token is distinct from v_secret then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(v_phone) = 12 and left(v_phone,2) = '91' then v_phone := right(v_phone,10); end if;
  if length(v_phone) = 11 and left(v_phone,1) = '0' then v_phone := right(v_phone,10); end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a 10-digit Indian mobile number.');
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'field', 'full_name', 'error', 'Enter your full name.');
  end if;
  if v_email is not null and (length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return jsonb_build_object('ok', false, 'field', 'email', 'error', 'That email address does not look right.');
  end if;
  begin
    v_kind := (p_data->>'kind')::public.lead_kind;
  exception when others then
    return jsonb_build_object('ok', false, 'field', 'kind', 'error', 'Choose who you are.');
  end;
  if v_kind is null then
    return jsonb_build_object('ok', false, 'field', 'kind', 'error', 'Choose who you are.');
  end if;
  if (p_data->>'is_adult') is distinct from 'true' then
    return jsonb_build_object('ok', false, 'field', 'is_adult',
      'error', 'Pre-registration is for people aged 18 or above. If you are younger, ask a parent or your college coordinator to register.');
  end if;
  if (p_data->>'consent_contact') is distinct from 'true' then
    return jsonb_build_object('ok', false, 'field', 'consent_contact', 'error', 'We need your permission to contact you about the launch.');
  end if;

  select * into v_row from public.leads where phone = v_phone;
  if found then
    return jsonb_build_object('ok', true, 'existing', true, 'serial', v_row.serial, 'code', v_row.my_code);
  end if;

  if p_ip_hash is not null then
    select count(*) into v_recent from public.leads
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_recent >= 10 then
      return jsonb_build_object('ok', false, 'error', 'Too many registrations from this connection. Try again in an hour.');
    end if;
  end if;

  insert into public.leads (kind, full_name, phone, email, organisation, city, interests, message,
                            is_adult, consent_contact, source, utm, referred_by, my_code, ip_hash, user_agent)
  values (v_kind, v_name, v_phone, v_email,
          nullif(btrim(left(p_data->>'organisation', 120)), ''),
          nullif(btrim(left(p_data->>'city', 80)), ''),
          coalesce(array(select left(x, 40) from jsonb_array_elements_text(
              case when jsonb_typeof(p_data->'interests') = 'array' then p_data->'interests' else '[]'::jsonb end) x limit 12), '{}'),
          nullif(btrim(left(p_data->>'message', 1000)), ''),
          true, true,
          nullif(left(p_data->>'source', 120), ''),
          case when jsonb_typeof(p_data->'utm') = 'object' then p_data->'utm' else null end,
          nullif(upper(left(regexp_replace(coalesce(p_data->>'ref',''), '[^A-Za-z0-9]', '', 'g'), 12)), ''),
          upper(encode(extensions.gen_random_bytes(4), 'hex')),
          p_ip_hash, left(p_user_agent, 300))
  returning * into v_row;

  return jsonb_build_object('ok', true, 'existing', false, 'serial', v_row.serial, 'code', v_row.my_code);
end $$;
revoke all on function public.submit_lead(text, jsonb, text, text) from public;
grant execute on function public.submit_lead(text, jsonb, text, text) to anon, authenticated;

-- Seed: four plans with no price yet (admin decides), and public settings ---
insert into public.membership_plans (code, audience, name, tagline, duration_months, price_inr, benefits, requires_approval, is_published, sort_order) values
  ('student-annual', 'student', 'Student', 'For diploma, degree and postgraduate students', 12, null,
   '["Verified GRAAS member ID with QR","Membership certificate","Member price on paid events and courses","Member-only live sessions","Join or start a chapter in your college"]', false, true, 10),
  ('professional-annual', 'professional', 'Professional', 'For working engineers, faculty and researchers', 12, null,
   '["Verified GRAAS member ID with QR","Membership certificate","Member price on paid events and courses","Speak, mentor or judge at GRAAS programmes","Opt-in professional directory"]', false, true, 20),
  ('institution-annual', 'institution', 'Institution', 'For schools, colleges and universities', 12, null,
   '["Verified institution profile","Run a GRAAS chapter with a faculty coordinator","Bulk student membership","Chapter workspace and activity reports","Host GRAAS lectures and events on campus"]', true, true, 30),
  ('industry-annual', 'industry', 'Industry', 'For manufacturers and automation companies', 12, null,
   '["Verified company profile","Post jobs and internships to members","Publish automation challenges for student teams","Guest lectures and industrial visits","Sponsor events and competitions"]', true, true, 40);

insert into public.site_settings (key, value, is_public) values
  ('org', '{"name":"Global Robotics And Automation Society","short":"GRAAS","email":null,"phone":null,"address":null}', true),
  ('graascon', '{"year":2027,"dates":null,"venue":null,"cfp_url":null}', true),
  ('prereg', '{"open":true}', true);
