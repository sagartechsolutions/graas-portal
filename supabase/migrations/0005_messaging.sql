-- Messaging: email (Brevo) and WhatsApp (Meta Cloud API).
-- Verification codes, password reset, and a message for every account, membership, payment and help-desk event.
-- Messages are queued in public.messages and sent by the `notify` edge function, which pg_net calls right after
-- each queueing statement commits and pg_cron calls every two minutes as a safety net.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------------------------------------------
-- Profiles: verification state and member choices
-- ---------------------------------------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists wa_updates boolean not null default false,
  add column if not exists email_news boolean not null default true;

-- Accounts that exist today are the founding staff accounts.
update public.profiles set email_verified_at = coalesce(email_verified_at, now());

-- Members change their details only through member_* functions, never by writing the row directly.
revoke update on public.profiles from anon, authenticated;

create or replace function private.profile_reset_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email and new.email_verified_at is not distinct from old.email_verified_at then
    new.email_verified_at := null;
  end if;
  if new.phone is distinct from old.phone and new.phone_verified_at is not distinct from old.phone_verified_at then
    new.phone_verified_at := null;
    new.wa_updates := false;
  end if;
  return new;
end $$;
drop trigger if exists profiles_reset_verification on public.profiles;
create trigger profiles_reset_verification before update of email, phone on public.profiles
  for each row execute function private.profile_reset_verification();

-- ---------------------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists private.otp_codes (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('verify_email', 'verify_phone', 'reset_password', 'change_email')),
  channel text not null check (channel in ('email', 'whatsapp')),
  user_id uuid references auth.users (id) on delete cascade,
  target text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_target on private.otp_codes (target, purpose, created_at desc);
create index if not exists otp_codes_ip on private.otp_codes (ip_hash, created_at desc);
alter table private.otp_codes enable row level security;

create table if not exists public.message_templates (
  event text not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  audience text not null default 'member' check (audience in ('member', 'staff')),
  label text not null,
  description text,
  enabled boolean not null default true,
  locked boolean not null default false,
  subject text,
  body text not null,
  wa_name text,
  wa_lang text not null default 'en',
  wa_category text check (wa_category in ('AUTHENTICATION', 'UTILITY', 'MARKETING')),
  wa_params text[] not null default '{}',
  wa_status text,
  sort int not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (event, channel)
);
alter table public.message_templates enable row level security;
drop policy if exists templates_select on public.message_templates;
create policy templates_select on public.message_templates for select to authenticated
  using (private.is_staff(array['communications', 'support', 'membership_desk']::public.staff_role[]));
drop policy if exists templates_update on public.message_templates;
create policy templates_update on public.message_templates for update to authenticated
  using (private.is_staff(array['communications']::public.staff_role[]))
  with check (private.is_staff(array['communications']::public.staff_role[]));
revoke insert, update, delete on public.message_templates from anon, authenticated;
grant update (subject, body, enabled, updated_at, updated_by) on public.message_templates to authenticated;

create or replace function private.template_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.locked then new.enabled := true; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists message_templates_guard on public.message_templates;
create trigger message_templates_guard before update on public.message_templates
  for each row execute function private.template_guard();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  to_addr text not null,
  vars jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  send_after timestamptz not null default now(),
  claimed_at timestamptz,
  subject text,
  provider_id text,
  error text,
  sent_at timestamptz,
  dedupe_key text unique,
  created_by uuid
);
create index if not exists messages_queue on public.messages (send_after) where status = 'queued';
create index if not exists messages_user on public.messages (user_id, created_at desc);
create index if not exists messages_recent on public.messages (created_at desc);
alter table public.messages enable row level security;
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (private.is_staff(array['communications', 'support', 'membership_desk']::public.staff_role[]));
revoke insert, update, delete on public.messages from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Settings and secrets
-- ---------------------------------------------------------------------------------------------------------------
insert into public.site_settings (key, value, is_public) values ('messaging', jsonb_build_object(
  'email', jsonb_build_object('enabled', false, 'sender_name', 'GRAAS', 'sender_email', 'no-reply@graas.org.in',
                              'reply_to', 'connect@graas.org.in', 'has_key', false),
  'whatsapp', jsonb_build_object('enabled', false, 'phone_number_id', null, 'waba_id', null, 'display_phone', null,
                                 'api_version', 'v25.0', 'has_token', false),
  'verify', jsonb_build_object('email_required', true, 'phone_required', false),
  'alerts_email', 'connect@graas.org.in',
  'reminder_days', jsonb_build_array(30, 7, 1),
  'expired_notice', true), false)
on conflict (key) do nothing;

insert into private.app_secrets (key, value) values
  ('otp_pepper', encode(extensions.gen_random_bytes(32), 'hex')),
  ('notify_key', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------------------------
create or replace function private.msg_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.site_settings where key = 'messaging'), '{}'::jsonb)
$$;

create or replace function private.email_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.msg_settings() -> 'email' ->> 'enabled')::boolean, false)
     and exists (select 1 from private.app_secrets where key = 'brevo_api_key')
$$;

create or replace function private.wa_codes_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.msg_settings() -> 'whatsapp' ->> 'enabled')::boolean, false)
     and exists (select 1 from private.app_secrets where key = 'wa_token')
     and exists (select 1 from public.message_templates where event = 'code_verify_phone' and channel = 'whatsapp' and wa_status = 'APPROVED')
$$;

create or replace function private.inr(p_paise bigint) returns text
language sql immutable set search_path = '' as $$
  select '₹' || case when p_paise % 100 = 0 then to_char(p_paise / 100, 'FM99,99,99,99,999')
                     else to_char(p_paise / 100.0, 'FM99,99,99,99,990.00') end
$$;

create or replace function private.fmt_date(p date) returns text
language sql immutable set search_path = '' as $$
  select to_char(p, 'FMDD Mon YYYY')
$$;

create or replace function private.code_hash(p_target text, p_code text) returns text
language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest(coalesce((select value from private.app_secrets where key = 'otp_pepper'), '')
    || '|' || lower(p_target) || '|' || p_code, 'sha256'), 'hex')
$$;

-- Calls the notify function once per transaction, after commit, when something is waiting to go out.
create or replace function private.kick_dispatch() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('graas.kicked', true), '') = '1' then return; end if;
  if not exists (select 1 from public.messages where status = 'queued' and send_after <= now()) then return; end if;
  perform set_config('graas.kicked', '1', true);
  perform net.http_post(
    url := 'https://txiohgergoxxtfjsyqva.supabase.co/functions/v1/notify',
    body := '{}'::jsonb,
    headers := jsonb_build_object('content-type', 'application/json',
                                  'x-notify-key', (select value from private.app_secrets where key = 'notify_key')),
    timeout_milliseconds := 8000);
end $$;

create or replace function private.msg_kick_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.kick_dispatch();
  return null;
end $$;
drop trigger if exists messages_kick on public.messages;
create trigger messages_kick after insert on public.messages
  for each statement execute function private.msg_kick_trigger();

-- Queues one event for a member on every channel that is switched on for it and that they can receive.
create or replace function private.enqueue(p_user uuid, p_event text, p_vars jsonb default '{}'::jsonb,
                                           p_dedupe text default null, p_channels text[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles; t public.message_templates; s jsonb := private.msg_settings(); v jsonb; n int := 0; k int;
  v_email_on boolean := private.email_on();
begin
  if p_user is null then return 0; end if;
  select * into p from public.profiles where id = p_user;
  if not found then return 0; end if;
  v := jsonb_build_object('name', coalesce(nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''), 'there'),
                          'full_name', coalesce(p.full_name, ''), 'email', coalesce(p.email, ''))
       || coalesce(p_vars, '{}'::jsonb);
  for t in select * from public.message_templates
           where event = p_event and audience = 'member' and enabled and (p_channels is null or channel = any (p_channels))
  loop
    k := 0;
    if t.channel = 'email' then
      continue when coalesce(p.email, '') = '';
      continue when p_event = 'broadcast' and not p.email_news;
      insert into public.messages (user_id, event, channel, to_addr, vars, dedupe_key, status, error)
      values (p_user, p_event, 'email', p.email, v, p_dedupe || ':email',
              case when v_email_on then 'queued' else 'skipped' end,
              case when v_email_on then null else 'Email sending is switched off in Admin.' end)
      on conflict (dedupe_key) do nothing;
      get diagnostics k = row_count;
    else
      continue when not coalesce((s -> 'whatsapp' ->> 'enabled')::boolean, false)
                 or t.wa_name is null or coalesce(t.wa_status, '') <> 'APPROVED';
      continue when p.phone is null or p.phone_verified_at is null or not p.wa_updates;
      insert into public.messages (user_id, event, channel, to_addr, vars, dedupe_key)
      values (p_user, p_event, 'whatsapp', '91' || p.phone, v, p_dedupe || ':whatsapp')
      on conflict (dedupe_key) do nothing;
      get diagnostics k = row_count;
    end if;
    n := n + k;
  end loop;
  return n;
end $$;

-- Queues a staff alert to the alert address(es) set in Admin > Messages.
create or replace function private.enqueue_staff(p_event text, p_vars jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare s jsonb := private.msg_settings(); a text; n int := 0; v_on boolean := private.email_on();
begin
  if not exists (select 1 from public.message_templates
                 where event = p_event and channel = 'email' and audience = 'staff' and enabled) then
    return 0;
  end if;
  for a in select distinct lower(trim(x)) from regexp_split_to_table(coalesce(s ->> 'alerts_email', ''), '[,;[:space:]]+') x
           where trim(x) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  loop
    insert into public.messages (event, channel, to_addr, vars, status, error)
    values (p_event, 'email', a, coalesce(p_vars, '{}'::jsonb) || jsonb_build_object('name', 'team'),
            case when v_on then 'queued' else 'skipped' end,
            case when v_on then null else 'Email sending is switched off in Admin.' end);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Event triggers
-- ---------------------------------------------------------------------------------------------------------------
create or replace function private.msg_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; p public.profiles; v jsonb; q jsonb; v_event text; v_topic text;
begin
  select * into pl from public.membership_plans where id = new.plan_id;
  select * into p from public.profiles where id = new.user_id;
  q := private.quote(new.plan_id, null);
  v := jsonb_build_object(
    'plan', coalesce(pl.name, 'GRAAS membership'),
    'member_no', coalesce(new.member_no, ''),
    'valid_till', case when new.ends_on is null then 'lifetime' else private.fmt_date(new.ends_on) end,
    'reason', coalesce(nullif(trim(new.decision_reason), ''), 'Not given'),
    'amount', case when coalesce((q ->> 'ok')::boolean, false) then private.inr((q ->> 'total_paise')::bigint)
                   else 'the membership fee' end,
    'link', 'https://graas.org.in/account');
  if tg_op = 'INSERT' then
    if new.status = 'pending_approval' then
      perform private.enqueue(new.user_id, 'application_received', v);
    elsif new.status = 'pending_payment' and coalesce(pl.price_inr, 1) <> 0 then
      perform private.enqueue(new.user_id, 'payment_due', v);
    end if;
    perform private.enqueue_staff('staff_new_application', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, ''), 'applicant_email', coalesce(p.email, ''), 'applicant_phone', coalesce(p.phone, ''),
      'next_step', case when new.status = 'pending_approval' then 'It is waiting for your approval.'
                        else 'This plan needs no approval, so the applicant can pay straight away.' end));
    return null;
  end if;
  if new.status is distinct from old.status then
    v_event := case
      when new.status = 'pending_payment' and old.status = 'pending_approval' and coalesce(pl.price_inr, 1) <> 0 then 'payment_due'
      when new.status = 'active' and old.status in ('pending_approval', 'pending_payment') then 'membership_active'
      when new.status = 'active' and old.status = 'suspended' then 'membership_reinstated'
      when new.status = 'rejected' then 'application_rejected'
      when new.status = 'suspended' then 'membership_suspended'
      when new.status = 'cancelled' then 'membership_cancelled'
    end;
    v_topic := case when old.status in ('pending_approval', 'pending_payment') then 'membership application' else 'membership' end;
  elsif new.status = 'active' and new.ends_on is not null and old.ends_on is not null and new.ends_on > old.ends_on then
    v_event := 'membership_renewed';
    v_topic := 'membership';
  end if;
  if v_event is not null then
    perform private.enqueue(new.user_id, v_event, v || jsonb_build_object('topic', v_topic));
  end if;
  return null;
end $$;
drop trigger if exists memberships_messages on public.memberships;
create trigger memberships_messages after insert or update of status, ends_on on public.memberships
  for each row execute function private.msg_membership();

create or replace function private.msg_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v jsonb; p public.profiles;
begin
  v := jsonb_build_object(
    'amount', private.inr(new.total_paise),
    'plan', coalesce(new.plan_name, 'GRAAS membership'),
    'receipt_no', coalesce(new.receipt_no, ''),
    'paid_on', private.fmt_date((coalesce(new.paid_at, now()) at time zone 'Asia/Kolkata')::date),
    'reason', coalesce(nullif(trim(new.failure_reason), ''), 'The bank or payment app declined it.'),
    'link', 'https://graas.org.in/account');
  select * into p from public.profiles where id = new.user_id;
  if new.status = 'paid' and old.status is distinct from 'paid' and new.total_paise > 0 then
    perform private.enqueue(new.user_id, 'payment_received', v, 'paid:' || new.id);
    perform private.enqueue_staff('staff_payment_received', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'applicant_email', coalesce(p.email, new.payer_email, ''),
      'kind', case when new.kind = 'renewal' then 'renewal' else 'new membership' end));
  elsif new.status = 'failed' and old.status = 'created' then
    perform private.enqueue(new.user_id, 'payment_failed', v);
  end if;
  if new.needs_review and not coalesce(old.needs_review, false) then
    perform private.enqueue_staff('staff_payment_review', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'note', coalesce(new.review_note, '')));
  end if;
  return null;
end $$;
drop trigger if exists orders_messages on public.orders;
create trigger orders_messages after update of status, needs_review on public.orders
  for each row execute function private.msg_order();

create or replace function private.msg_refund() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o public.orders; v jsonb; who text;
begin
  select * into o from public.orders where id = new.order_id;
  v := jsonb_build_object('amount', private.inr(new.amount_paise), 'receipt_no', coalesce(o.receipt_no, ''),
                          'reason', coalesce(new.reason, ''), 'plan', coalesce(o.plan_name, ''), 'link', 'https://graas.org.in/account');
  if tg_op = 'INSERT' then
    select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = new.requested_by;
    perform private.enqueue_staff('staff_refund_request', v || jsonb_build_object(
      'requested_by', coalesce(who, 'A staff member'), 'applicant', coalesce(o.payer_name, '')));
  elsif new.status = 'processed' and old.status is distinct from 'processed' then
    perform private.enqueue(o.user_id, 'refund_processed', v, 'refund:' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists refunds_messages on public.refunds;
create trigger refunds_messages after insert or update of status on public.refunds
  for each row execute function private.msg_refund();

create or replace function private.msg_ticket() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v jsonb; p public.profiles;
begin
  v := jsonb_build_object('ticket_subject', coalesce(new.subject, ''), 'message', left(coalesce(new.message, ''), 1500),
                          'reply', coalesce(new.reply, ''), 'topic', 'help request', 'link', 'https://graas.org.in/account');
  if tg_op = 'INSERT' then
    select * into p from public.profiles where id = new.user_id;
    perform private.enqueue(new.user_id, 'ticket_received', v);
    perform private.enqueue_staff('staff_new_ticket', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, ''), 'applicant_email', coalesce(p.email, ''), 'applicant_phone', coalesce(p.phone, '')));
  elsif new.reply is not null and new.reply is distinct from old.reply then
    perform private.enqueue(new.user_id, 'ticket_replied', v);
  end if;
  return null;
end $$;
drop trigger if exists tickets_messages on public.tickets;
create trigger tickets_messages after insert or update of reply on public.tickets
  for each row execute function private.msg_ticket();

create or replace function private.msg_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_staff('staff_new_lead', jsonb_build_object(
    'lead_name', coalesce(new.full_name, ''), 'lead_phone', coalesce(new.phone, ''), 'lead_email', coalesce(new.email, ''),
    'lead_kind', coalesce(new.kind::text, ''), 'lead_city', coalesce(new.city, ''),
    'message', left(coalesce(new.message, ''), 1500), 'link', 'https://graas.org.in/admin'));
  return null;
end $$;
drop trigger if exists leads_messages on public.leads;
create trigger leads_messages after insert on public.leads
  for each row execute function private.msg_lead();

-- Daily: renewal reminders, expiry notices, clean-up. Runs at 09:15 IST.
create or replace function private.run_daily() returns void
language plpgsql security definer set search_path = '' as $$
declare
  r record; s jsonb := private.msg_settings(); d int;
  v_days int[] := coalesce((select array_agg(x::int) from jsonb_array_elements_text(s -> 'reminder_days') x), array[30, 7, 1]);
begin
  for r in select m.id, m.user_id, m.member_no, m.ends_on, pl.name as plan_name
           from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
           where m.status = 'active' and m.ends_on is not null
             and m.ends_on between private.today() - 1 and private.today() + 400
  loop
    d := r.ends_on - private.today();
    if d = any (v_days) then
      perform private.enqueue(r.user_id, 'renewal_reminder', jsonb_build_object(
        'plan', r.plan_name, 'member_no', coalesce(r.member_no, ''), 'valid_till', private.fmt_date(r.ends_on),
        'days_text', case d when 0 then 'today' when 1 then 'tomorrow' else 'in ' || d || ' days' end,
        'link', 'https://graas.org.in/account'), 'renew:' || r.id || ':' || r.ends_on || ':' || d);
    elsif d = -1 and coalesce((s ->> 'expired_notice')::boolean, true) then
      perform private.enqueue(r.user_id, 'membership_expired', jsonb_build_object(
        'plan', r.plan_name, 'member_no', coalesce(r.member_no, ''), 'valid_till', private.fmt_date(r.ends_on),
        'link', 'https://graas.org.in/account'), 'expired:' || r.id || ':' || r.ends_on);
    end if;
  end loop;
  delete from private.otp_codes where created_at < now() - interval '2 days';
  delete from public.messages where created_at < now() - interval '400 days';
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Functions for the edge functions (service role only)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.svc_messaging() returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.msg_settings() || jsonb_build_object(
    'brevo_key', (select value from private.app_secrets where key = 'brevo_api_key'),
    'wa_token', (select value from private.app_secrets where key = 'wa_token'),
    'notify_key', (select value from private.app_secrets where key = 'notify_key'),
    'templates', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.message_templates t))
$$;

create or replace function public.svc_claim_messages(p_limit int default 40) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  update public.messages set status = 'queued' where status = 'sending' and claimed_at < now() - interval '10 minutes';
  with c as (
    select id from public.messages where status = 'queued' and send_after <= now()
    order by created_at limit greatest(1, least(coalesce(p_limit, 40), 100)) for update skip locked
  ), u as (
    update public.messages m set status = 'sending', attempts = m.attempts + 1, claimed_at = now()
    from c where m.id = c.id returning m.*
  )
  select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) into r from u;
  return r;
end $$;

create or replace function public.svc_message_done(p_id uuid, p_ok boolean, p_provider_id text, p_error text,
                                                   p_subject text, p_retry boolean)
returns void language sql security definer set search_path = '' as $$
  update public.messages set
    status = case when p_ok then 'sent' when p_retry and attempts < 5 then 'queued' else 'failed' end,
    sent_at = case when p_ok then now() else null end,
    provider_id = p_provider_id,
    error = case when p_ok then null else left(p_error, 500) end,
    subject = coalesce(p_subject, subject),
    send_after = case when not p_ok and p_retry then now() + make_interval(mins => attempts * attempts * 2) else send_after end
  where id = p_id
$$;

create or replace function public.svc_log_message(p_user uuid, p_event text, p_channel text, p_to text, p_vars jsonb,
                                                  p_ok boolean, p_provider_id text, p_error text, p_subject text, p_actor uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.messages (user_id, event, channel, to_addr, vars, status, attempts, provider_id, error, subject, sent_at, created_by)
  values (p_user, p_event, p_channel, p_to, coalesce(p_vars, '{}'::jsonb), case when p_ok then 'sent' else 'failed' end, 1,
          p_provider_id, case when p_ok then null else left(p_error, 500) end, p_subject, case when p_ok then now() end, p_actor)
$$;

create or replace function public.svc_enqueue(p_user uuid, p_event text, p_vars jsonb, p_dedupe text)
returns integer language sql security definer set search_path = '' as $$
  select private.enqueue(p_user, p_event, p_vars, p_dedupe)
$$;

create or replace function public.svc_issue_code(p_purpose text, p_channel text, p_target text, p_user uuid, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_last timestamptz; v_n int; v_ip int; b bytea; v_code text;
begin
  select max(created_at), count(*) filter (where created_at > now() - interval '1 hour')
    into v_last, v_n from private.otp_codes where target = p_target and purpose = p_purpose;
  if v_last > now() - interval '45 seconds' then
    return jsonb_build_object('ok', false, 'error', 'A code was just sent. Wait a minute before asking for another.', 'wait', 45);
  end if;
  if v_n >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many codes asked for. Try again in an hour.');
  end if;
  if p_ip_hash is not null then
    select count(*) into v_ip from private.otp_codes where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_ip >= 20 then return jsonb_build_object('ok', false, 'error', 'Too many codes asked for. Try again in an hour.'); end if;
  end if;
  update private.otp_codes set used_at = now() where target = p_target and purpose = p_purpose and used_at is null;
  b := extensions.gen_random_bytes(4);
  v_code := lpad((((get_byte(b, 0)::bigint << 24) | (get_byte(b, 1) << 16) | (get_byte(b, 2) << 8) | get_byte(b, 3)) % 1000000)::text, 6, '0');
  insert into private.otp_codes (purpose, channel, user_id, target, code_hash, expires_at, ip_hash)
  values (p_purpose, p_channel, p_user, p_target, private.code_hash(p_target, v_code), now() + interval '10 minutes', p_ip_hash);
  return jsonb_build_object('ok', true, 'code', v_code, 'minutes', 10);
end $$;

create or replace function public.svc_check_code(p_purpose text, p_target text, p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c private.otp_codes; v_code text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
begin
  select * into c from private.otp_codes where target = p_target and purpose = p_purpose and used_at is null
  order by created_at desc limit 1 for update;
  if not found or c.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'This code has expired or was replaced. Ask for a new one.');
  end if;
  if c.attempts >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many wrong tries. Ask for a new code.');
  end if;
  if length(v_code) <> 6 or c.code_hash <> private.code_hash(p_target, v_code) then
    update private.otp_codes set attempts = attempts + 1 where id = c.id;
    return jsonb_build_object('ok', false, 'error',
      case when c.attempts + 1 >= 5 then 'That code is not right, and it has now stopped working. Ask for a new one.'
           else 'That code is not right. Check it and try again.' end);
  end if;
  update private.otp_codes set used_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'user_id', c.user_id);
end $$;

create or replace function public.svc_find_account(p_email text, p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('user_id', id, 'email', email, 'phone', phone)
  from public.profiles
  where (p_email is not null and lower(email) = lower(p_email))
     or (p_phone is not null and phone = p_phone and phone_verified_at is not null)
  order by (p_email is not null and lower(email) = lower(p_email)) desc, phone_verified_at desc nulls last
  limit 1
$$;

create or replace function public.svc_mark_verified(p_user uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Account not found.'); end if;
  if p_kind = 'email' then
    if p.email_verified_at is null then
      update public.profiles set email_verified_at = now() where id = p_user;
      if not exists (select 1 from public.staff_members where user_id = p_user) then
        perform private.enqueue(p_user, 'welcome', jsonb_build_object('link', 'https://graas.org.in/account'), 'welcome:' || p_user);
      end if;
    end if;
    return jsonb_build_object('ok', true);
  elsif p_kind = 'phone' then
    if p.phone is null then return jsonb_build_object('ok', false, 'error', 'Add your mobile number first.'); end if;
    if exists (select 1 from public.profiles where phone = p.phone and phone_verified_at is not null and id <> p_user) then
      return jsonb_build_object('ok', false, 'error', 'This number is already confirmed on another GRAAS account.');
    end if;
    update public.profiles set phone_verified_at = now(), wa_updates = true where id = p_user;
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'error', 'Unknown check.');
end $$;

create or replace function public.svc_set_email(p_user uuid, p_email text) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set email = lower(p_email), email_verified_at = now() where id = p_user
$$;

create or replace function public.svc_email_taken(p_email text, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where lower(email) = lower(p_email) and id <> p_user)
      or exists (select 1 from auth.users where lower(email) = lower(p_email) and id <> p_user)
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Member functions
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.member_set_alerts(p_wa_updates boolean, p_email_news boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = (select auth.uid());
  if not found then return jsonb_build_object('ok', false, 'error', 'Please sign in again.'); end if;
  if coalesce(p_wa_updates, false) and p.phone_verified_at is null then
    return jsonb_build_object('ok', false, 'error', 'Confirm your WhatsApp number first.');
  end if;
  update public.profiles set wa_updates = coalesce(p_wa_updates, false), email_news = coalesce(p_email_news, true)
  where id = p.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.my_account() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'membership', (select (to_jsonb(m) - 'staff_note') || jsonb_build_object('plan', to_jsonb(pl), 'quote', private.quote(pl.id, null))
                   from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
                   where m.user_id = (select auth.uid())
                   order by (m.status in ('pending_approval','pending_payment','active','suspended')) desc, m.created_at desc limit 1),
    'orders', coalesce((select jsonb_agg((to_jsonb(o) - 'needs_review' - 'review_note') order by o.created_at desc)
                        from public.orders o where o.user_id = (select auth.uid()) and o.status in ('paid','failed','refunded')), '[]'::jsonb),
    'tickets', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.tickets t where t.user_id = (select auth.uid())), '[]'::jsonb),
    'referrals', (select count(*) from public.profiles r where r.referred_by = (select referral_code from public.profiles where id = (select auth.uid()))),
    'pay_online', coalesce((select (value->>'enabled')::boolean and (value->>'has_secret')::boolean from public.site_settings where key = 'gateway'), false),
    'is_staff', exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.is_active),
    'channels', jsonb_build_object(
      'email', private.email_on(),
      'whatsapp', private.wa_codes_on(),
      'email_required', private.email_on() and coalesce((private.msg_settings() -> 'verify' ->> 'email_required')::boolean, true),
      'phone_required', private.wa_codes_on() and coalesce((private.msg_settings() -> 'verify' ->> 'phone_required')::boolean, false)),
    'today', private.today())
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Staff functions
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.staff_messaging() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not private.is_staff(array['communications', 'support', 'membership_desk']::public.staff_role[]) then null
  else private.msg_settings() || jsonb_build_object(
    'email_ready', private.email_on(),
    'wa_codes_ready', private.wa_codes_on(),
    'has_brevo_key', exists (select 1 from private.app_secrets where key = 'brevo_api_key'),
    'has_wa_token', exists (select 1 from private.app_secrets where key = 'wa_token'),
    'can_edit_keys', private.is_staff(array['super_admin']::public.staff_role[]),
    'stats', jsonb_build_object(
      'sent_24h', (select count(*) from public.messages where status = 'sent' and created_at > now() - interval '24 hours'),
      'failed_24h', (select count(*) from public.messages where status = 'failed' and created_at > now() - interval '24 hours'),
      'queued', (select count(*) from public.messages where status in ('queued', 'sending')),
      'skipped_24h', (select count(*) from public.messages where status = 'skipped' and created_at > now() - interval '24 hours'),
      'email_verified', (select count(*) from public.profiles where email_verified_at is not null),
      'phone_verified', (select count(*) from public.profiles where phone_verified_at is not null),
      'accounts', (select count(*) from public.profiles)),
    'webhook_hint', 'https://txiohgergoxxtfjsyqva.supabase.co/functions/v1/notify') end
$$;

create or replace function public.staff_set_messaging(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s jsonb := private.msg_settings(); e jsonb; w jsonb; v_key text; v_tok text; v_days jsonb; v_has_key boolean; v_has_tok boolean;
begin
  if not private.is_staff(array['super_admin']::public.staff_role[]) then
    return jsonb_build_object('ok', false, 'error', 'Only a super admin can change message settings.');
  end if;
  e := coalesce(s -> 'email', '{}'::jsonb);
  w := coalesce(s -> 'whatsapp', '{}'::jsonb);

  if p ? 'email' then
    if coalesce((p -> 'email' ->> 'clear_key')::boolean, false) then
      delete from private.app_secrets where key = 'brevo_api_key';
    end if;
    v_key := nullif(trim(coalesce(p -> 'email' ->> 'api_key', '')), '');
    if v_key is not null then
      if v_key !~ '^xkeysib-[A-Za-z0-9-]{20,}$' then
        return jsonb_build_object('ok', false, 'error', 'A Brevo API key starts with xkeysib-. Copy the whole key from Brevo.');
      end if;
      insert into private.app_secrets (key, value) values ('brevo_api_key', v_key) on conflict (key) do update set value = excluded.value;
    end if;
    if nullif(trim(coalesce(p -> 'email' ->> 'sender_email', '')), '') is not null
       and trim(p -> 'email' ->> 'sender_email') !~ '^[^@[:space:]]+@graas\.org\.in$' then
      return jsonb_build_object('ok', false, 'error', 'The sender address must end with @graas.org.in, the domain verified in Brevo.');
    end if;
    if nullif(trim(coalesce(p -> 'email' ->> 'reply_to', '')), '') is not null
       and trim(p -> 'email' ->> 'reply_to') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      return jsonb_build_object('ok', false, 'error', 'Enter a valid reply-to address.');
    end if;
    v_has_key := exists (select 1 from private.app_secrets where key = 'brevo_api_key');
    if coalesce((p -> 'email' ->> 'enabled')::boolean, false) and not v_has_key then
      return jsonb_build_object('ok', false, 'error', 'Paste the Brevo API key before switching email on.');
    end if;
    e := jsonb_build_object(
      'enabled', coalesce((p -> 'email' ->> 'enabled')::boolean, false) and v_has_key,
      'sender_name', left(coalesce(nullif(trim(p -> 'email' ->> 'sender_name'), ''), e ->> 'sender_name', 'GRAAS'), 60),
      'sender_email', lower(coalesce(nullif(trim(p -> 'email' ->> 'sender_email'), ''), e ->> 'sender_email')),
      'reply_to', lower(coalesce(nullif(trim(p -> 'email' ->> 'reply_to'), ''), e ->> 'reply_to')),
      'has_key', v_has_key);
  end if;

  if p ? 'whatsapp' then
    if coalesce((p -> 'whatsapp' ->> 'clear_token')::boolean, false) then
      delete from private.app_secrets where key = 'wa_token';
      update public.message_templates set wa_status = null where channel = 'whatsapp';
    end if;
    v_tok := nullif(trim(coalesce(p -> 'whatsapp' ->> 'token', '')), '');
    if v_tok is not null then
      if length(v_tok) < 50 or v_tok ~ '[[:space:]]' then
        return jsonb_build_object('ok', false, 'error', 'That does not look like a WhatsApp access token. Copy the whole token.');
      end if;
      insert into private.app_secrets (key, value) values ('wa_token', v_tok) on conflict (key) do update set value = excluded.value;
    end if;
    if coalesce(p -> 'whatsapp' ->> 'phone_number_id', '') !~ '^[0-9]*$' or coalesce(p -> 'whatsapp' ->> 'waba_id', '') !~ '^[0-9]*$' then
      return jsonb_build_object('ok', false, 'error', 'The Phone number ID and WhatsApp Business Account ID are numbers only.');
    end if;
    v_has_tok := exists (select 1 from private.app_secrets where key = 'wa_token');
    w := jsonb_build_object(
      'phone_number_id', coalesce(nullif(trim(p -> 'whatsapp' ->> 'phone_number_id'), ''), w ->> 'phone_number_id'),
      'waba_id', coalesce(nullif(trim(p -> 'whatsapp' ->> 'waba_id'), ''), w ->> 'waba_id'),
      'display_phone', left(coalesce(nullif(trim(p -> 'whatsapp' ->> 'display_phone'), ''), w ->> 'display_phone'), 30),
      'api_version', coalesce(nullif(trim(p -> 'whatsapp' ->> 'api_version'), ''), w ->> 'api_version', 'v25.0'),
      'has_token', v_has_tok);
    if coalesce((p -> 'whatsapp' ->> 'enabled')::boolean, false)
       and (not v_has_tok or w ->> 'phone_number_id' is null or w ->> 'waba_id' is null) then
      return jsonb_build_object('ok', false, 'error', 'Enter the Phone number ID, the Business Account ID and the access token before switching WhatsApp on.');
    end if;
    w := w || jsonb_build_object('enabled', coalesce((p -> 'whatsapp' ->> 'enabled')::boolean, false) and v_has_tok);
  end if;

  if p ? 'reminder_days' then
    select jsonb_agg(distinct x order by x) into v_days
    from (select (jsonb_array_elements_text(p -> 'reminder_days'))::int x) t where x between 0 and 90;
  end if;

  s := s || jsonb_build_object('email', e, 'whatsapp', w)
         || case when p ? 'verify' then jsonb_build_object('verify', jsonb_build_object(
              'email_required', coalesce((p -> 'verify' ->> 'email_required')::boolean, true),
              'phone_required', coalesce((p -> 'verify' ->> 'phone_required')::boolean, false))) else '{}'::jsonb end
         || case when p ? 'alerts_email' then jsonb_build_object('alerts_email', left(trim(p ->> 'alerts_email'), 300)) else '{}'::jsonb end
         || case when v_days is not null then jsonb_build_object('reminder_days', v_days) else '{}'::jsonb end
         || case when p ? 'expired_notice' then jsonb_build_object('expired_notice', coalesce((p ->> 'expired_notice')::boolean, true)) else '{}'::jsonb end;
  update public.site_settings set value = s, updated_by = (select auth.uid()), updated_at = now() where key = 'messaging';
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.staff_broadcast(p_audience text, p_subject text, p_body text, p_whatsapp boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; v_ch text[];
begin
  if not private.is_staff(array['communications']::public.staff_role[]) then
    return jsonb_build_object('ok', false, 'error', 'Your role cannot send updates to members.');
  end if;
  if char_length(trim(coalesce(p_subject, ''))) < 4 or char_length(trim(coalesce(p_body, ''))) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Write a subject and a message.');
  end if;
  if p_audience not in ('active', 'applicants', 'expiring', 'expired', 'all') then
    return jsonb_build_object('ok', false, 'error', 'Choose who should get it.');
  end if;
  v_ch := case when coalesce(p_whatsapp, false) then array['email', 'whatsapp'] else array['email'] end;
  for r in
    select distinct p.id from public.profiles p
    left join public.memberships m on m.user_id = p.id
    where not exists (select 1 from public.staff_members s where s.user_id = p.id)
      and case p_audience
        when 'all' then true
        when 'active' then m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today())
        when 'applicants' then m.status in ('pending_approval', 'pending_payment')
        when 'expiring' then m.status = 'active' and m.ends_on between private.today() and private.today() + 30
        when 'expired' then m.status = 'active' and m.ends_on < private.today()
      end
    limit 20000
  loop
    n := n + private.enqueue(r.id, 'broadcast', jsonb_build_object('subject', left(trim(p_subject), 150), 'body', left(trim(p_body), 8000),
                                                                     'link', 'https://graas.org.in/updates'), null, v_ch);
  end loop;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values ((select auth.uid()), 'broadcast', 'messages', p_audience, jsonb_build_object('subject', p_subject, 'messages', n));
  return jsonb_build_object('ok', true, 'messages', n);
end $$;

create or replace function public.staff_retry_message(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff(array['communications', 'support', 'membership_desk']::public.staff_role[]) then
    return jsonb_build_object('ok', false, 'error', 'Your role cannot do this.');
  end if;
  update public.messages set status = 'queued', attempts = 0, send_after = now(), error = null
  where id = p_id and status in ('failed', 'skipped') and event not like 'code_%';
  if not found then return jsonb_build_object('ok', false, 'error', 'Only a failed or skipped update can be sent again. Codes cannot.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------------------------------------------
revoke execute on function public.svc_messaging(), public.svc_claim_messages(int),
  public.svc_message_done(uuid, boolean, text, text, text, boolean),
  public.svc_log_message(uuid, text, text, text, jsonb, boolean, text, text, text, uuid),
  public.svc_enqueue(uuid, text, jsonb, text),
  public.svc_issue_code(text, text, text, uuid, text), public.svc_check_code(text, text, text),
  public.svc_find_account(text, text), public.svc_mark_verified(uuid, text), public.svc_set_email(uuid, text),
  public.svc_email_taken(text, uuid)
  from public, anon, authenticated;
grant execute on function public.svc_messaging(), public.svc_claim_messages(int),
  public.svc_message_done(uuid, boolean, text, text, text, boolean),
  public.svc_log_message(uuid, text, text, text, jsonb, boolean, text, text, text, uuid),
  public.svc_enqueue(uuid, text, jsonb, text),
  public.svc_issue_code(text, text, text, uuid, text), public.svc_check_code(text, text, text),
  public.svc_find_account(text, text), public.svc_mark_verified(uuid, text), public.svc_set_email(uuid, text),
  public.svc_email_taken(text, uuid)
  to service_role;
revoke execute on function public.member_set_alerts(boolean, boolean), public.staff_messaging(), public.staff_set_messaging(jsonb),
  public.staff_broadcast(text, text, text, boolean), public.staff_retry_message(uuid), public.my_account()
  from public, anon;
grant execute on function public.member_set_alerts(boolean, boolean), public.staff_messaging(), public.staff_set_messaging(jsonb),
  public.staff_broadcast(text, text, text, boolean), public.staff_retry_message(uuid), public.my_account()
  to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------------------------------------------
select cron.unschedule(jobname) from cron.job where jobname in ('graas-dispatch', 'graas-daily');
select cron.schedule('graas-dispatch', '*/2 * * * *', 'select private.kick_dispatch()');
select cron.schedule('graas-daily', '45 3 * * *', 'select private.run_daily()');
