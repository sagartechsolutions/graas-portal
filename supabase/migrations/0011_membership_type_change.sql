-- Membership type change after payment: the member asks, staff approve or decline.
-- On approval staff set the fee difference (a suggestion is worked out); the member pays it, or nothing if it is zero.
-- Member number and end date stay the same.

create table if not exists public.plan_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  from_plan_id uuid not null references public.membership_plans(id),
  to_plan_id uuid not null references public.membership_plans(id),
  details jsonb not null default '{}'::jsonb,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'awaiting_payment', 'done', 'declined', 'cancelled')),
  suggested_paise int,
  charge_paise int not null default 0 check (charge_paise >= 0),
  staff_note text,
  decided_by uuid,
  decided_at timestamptz,
  completed_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists plan_change_requests_user on public.plan_change_requests (user_id, created_at desc);
create unique index if not exists plan_change_requests_one_open on public.plan_change_requests (membership_id) where status in ('pending', 'awaiting_payment');
alter table public.plan_change_requests enable row level security;
create policy change_select on public.plan_change_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff(array['membership_desk', 'finance']::public.staff_role[]));
revoke insert, update, delete on public.plan_change_requests from anon, authenticated;
grant select on public.plan_change_requests to authenticated;
create trigger plan_change_requests_audit after insert or update or delete on public.plan_change_requests
  for each row execute function private.audit_row();

-- What an order pays for: a membership (new or renewal) or a type change. Type-change orders keep kind 'renewal'
-- for the existing kind rule and are told apart by purpose.
alter table public.orders add column if not exists purpose text not null default 'membership' check (purpose in ('membership', 'change'));

-- Suggested fee difference: yearly fee difference x days left / 365, less the length discount the member paid with,
-- rounded to the rupee. Zero for a move to a cheaper type; null while a fee is not set.
create or replace function private.change_estimate(p_membership uuid, p_to uuid) returns int
language plpgsql stable security definer set search_path = '' as $$
declare m public.memberships; fp public.membership_plans; tp public.membership_plans; o public.orders;
  v_diff numeric; v_days int; v_pct numeric := 0;
begin
  select * into m from public.memberships where id = p_membership;
  select * into fp from public.membership_plans where id = m.plan_id;
  select * into tp from public.membership_plans where id = p_to;
  if fp.price_inr is null or tp.price_inr is null then return null; end if;
  v_diff := (tp.price_inr - fp.price_inr) * 100;
  if v_diff <= 0 then return 0; end if;
  v_days := case when m.ends_on is null then 365 else greatest(m.ends_on - private.today() + 1, 0) end;
  select * into o from public.orders where membership_id = m.id and status = 'paid' and purpose = 'membership'
  order by paid_at desc nulls last limit 1;
  if found and o.base_paise > 0 then v_pct := o.term_discount_paise::numeric / o.base_paise; end if;
  return (round(v_diff * v_days / 365.0 * (1 - v_pct) / 100) * 100)::int;
end $$;

create or replace function private.change_vars(r public.plan_change_requests) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'from_plan', fp.name || ' membership', 'to_plan', tp.name || ' membership',
    'member_no', coalesce(m.member_no, ''),
    'valid_till', case when m.ends_on is null then 'lifetime' else private.fmt_date(m.ends_on) end,
    'topic', 'membership', 'link', 'https://graas.org.in/account')
  from public.memberships m, public.membership_plans fp, public.membership_plans tp
  where m.id = r.membership_id and fp.id = r.from_plan_id and tp.id = r.to_plan_id
$$;

-- Completes a change: new type and details; member number and dates unchanged.
create or replace function private.apply_change(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.plan_change_requests; tp public.membership_plans; v jsonb; d jsonb;
begin
  select * into r from public.plan_change_requests where id = p_id for update;
  if not found or r.status not in ('pending', 'awaiting_payment') then return; end if;
  select * into tp from public.membership_plans where id = r.to_plan_id;
  d := r.details;
  v := private.clean_details(tp.audience::text, d);
  update public.memberships set plan_id = tp.id,
    organisation = coalesce(left(nullif(trim(coalesce(d->>'organisation', '')), ''), 120), organisation)
  where id = r.membership_id;
  update public.profiles set kind = tp.audience::text,
    organisation = coalesce(left(nullif(trim(coalesce(d->>'organisation', '')), ''), 120), organisation),
    designation = case when tp.audience::text = 'student' then null when d ? 'designation' then left(nullif(trim(coalesce(d->>'designation', '')), ''), 120) else designation end,
    gender = coalesce(v->>'gender', gender), course = v->>'course', branch = v->>'branch', study_year = v->>'study_year'
  where id = r.user_id;
  update public.plan_change_requests set status = 'done', completed_at = now() where id = p_id;
  select * into r from public.plan_change_requests where id = p_id;
  perform private.enqueue(r.user_id, 'plan_change_done', private.change_vars(r), 'change-done:' || r.id);
end $$;

create or replace function public.member_request_change(p_plan_code text, p_details jsonb default '{}'::jsonb, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.memberships; tp public.membership_plans; pr public.profiles; merged jsonb; v jsonb; v_chk jsonb; v_est int; r public.plan_change_requests;
begin
  select * into m from public.memberships where user_id = (select auth.uid()) and status = 'active'
    and (ends_on is null or ends_on >= private.today()) order by created_at desc limit 1 for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'You can ask for a change while your membership is active. Before payment, change the type yourself on the Overview tab.');
  end if;
  if exists (select 1 from public.plan_change_requests where membership_id = m.id and status in ('pending', 'awaiting_payment')) then
    return jsonb_build_object('ok', false, 'error', 'You already have a change request open. Cancel it first to ask for a different one.');
  end if;
  select * into tp from public.membership_plans where code = p_plan_code and is_published;
  if not found then return jsonb_build_object('ok', false, 'field', 'plan', 'error', 'Choose the membership you want.'); end if;
  if tp.id = m.plan_id then return jsonb_build_object('ok', false, 'field', 'plan', 'error', 'That is already your membership.'); end if;
  select * into pr from public.profiles where id = m.user_id;
  merged := to_jsonb(pr) || coalesce(p_details, '{}'::jsonb);
  v_chk := private.check_details(tp.audience::text, merged);
  if v_chk is not null then return v_chk; end if;
  if char_length(trim(coalesce(merged->>'organisation', ''))) < 2 then
    return jsonb_build_object('ok', false, 'field', 'organisation', 'error', 'Enter your school, college, institution or company.');
  end if;
  v := private.clean_details(tp.audience::text, merged) || jsonb_build_object(
    'organisation', left(trim(merged->>'organisation'), 120),
    'designation', left(nullif(trim(coalesce(merged->>'designation', '')), ''), 120));
  v_est := private.change_estimate(m.id, tp.id);
  insert into public.plan_change_requests (user_id, membership_id, from_plan_id, to_plan_id, details, reason, suggested_paise)
  values (m.user_id, m.id, m.plan_id, tp.id, v, left(nullif(trim(coalesce(p_reason, '')), ''), 500), v_est)
  returning * into r;
  perform private.enqueue(r.user_id, 'plan_change_received', private.change_vars(r), 'change-received:' || r.id);
  perform private.enqueue_staff('staff_plan_change', private.change_vars(r) || jsonb_build_object(
    'applicant', coalesce(pr.full_name, ''), 'applicant_email', coalesce(pr.email, ''),
    'reason', coalesce(r.reason, 'Not given'),
    'amount', case when v_est is null then 'not known yet (a fee is not set)' when v_est = 0 then 'no extra fee' else private.inr(v_est) end));
  return jsonb_build_object('ok', true, 'id', r.id);
end $$;
revoke execute on function public.member_request_change(text, jsonb, text) from public, anon;
grant execute on function public.member_request_change(text, jsonb, text) to authenticated;

create or replace function public.member_cancel_change()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.plan_change_requests;
begin
  select * into r from public.plan_change_requests where user_id = (select auth.uid()) and status in ('pending', 'awaiting_payment') for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'There is no open change request.'); end if;
  update public.plan_change_requests set status = 'cancelled' where id = r.id;
  update public.orders set status = 'cancelled' where id = r.order_id and status = 'created';
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.member_cancel_change() from public, anon;
grant execute on function public.member_cancel_change() to authenticated;

create or replace function public.staff_decide_change(p_id uuid, p_approve boolean, p_charge_inr numeric default 0, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.plan_change_requests; m public.memberships; tp public.membership_plans; v_charge int; v_gst int;
begin
  if not private.is_staff(array['membership_desk']::public.staff_role[]) then
    return jsonb_build_object('ok', false, 'error', 'Your role cannot decide membership changes.');
  end if;
  select * into r from public.plan_change_requests where id = p_id for update;
  if not found or r.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'This request is no longer waiting for a decision.'); end if;
  if not p_approve then
    if char_length(trim(coalesce(p_note, ''))) < 3 then
      return jsonb_build_object('ok', false, 'error', 'Write a reason for declining. The member sees it.');
    end if;
    update public.plan_change_requests set status = 'declined', staff_note = left(trim(p_note), 500), decided_by = (select auth.uid()), decided_at = now() where id = r.id;
    perform private.enqueue(r.user_id, 'plan_change_declined', private.change_vars(r) || jsonb_build_object('reason', trim(p_note)), 'change-declined:' || r.id);
    return jsonb_build_object('ok', true);
  end if;
  select * into m from public.memberships where id = r.membership_id;
  if m.status <> 'active' or (m.ends_on is not null and m.ends_on < private.today()) then
    return jsonb_build_object('ok', false, 'error', 'This membership is no longer active, so its type cannot be changed.');
  end if;
  v_charge := round(coalesce(p_charge_inr, 0) * 100)::int;
  if v_charge < 0 or v_charge > 10000000 then return jsonb_build_object('ok', false, 'error', 'Enter a fee difference between ₹0 and ₹1,00,000.'); end if;
  update public.plan_change_requests set charge_paise = v_charge, staff_note = left(nullif(trim(coalesce(p_note, '')), ''), 500),
    decided_by = (select auth.uid()), decided_at = now(),
    status = case when v_charge = 0 then 'pending' else 'awaiting_payment' end
  where id = r.id;
  if v_charge = 0 then
    perform private.apply_change(r.id);
    return jsonb_build_object('ok', true, 'done', true);
  end if;
  select * into tp from public.membership_plans where id = r.to_plan_id;
  v_gst := round(v_charge * tp.gst_percent / 100)::int;
  perform private.enqueue(r.user_id, 'plan_change_approved', private.change_vars(r) || jsonb_build_object(
    'amount', private.inr(v_charge + v_gst)), 'change-approved:' || r.id);
  return jsonb_build_object('ok', true, 'awaiting_payment', true);
end $$;
revoke execute on function public.staff_decide_change(uuid, boolean, numeric, text) from public, anon;
grant execute on function public.staff_decide_change(uuid, boolean, numeric, text) to authenticated;

-- Order for an approved change (called by the portal function only).
create or replace function public.svc_new_change_order(p_user uuid, p_can_charge boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.plan_change_requests; m public.memberships; fp public.membership_plans; tp public.membership_plans; p public.profiles; v_gst int; v_id uuid;
begin
  select * into r from public.plan_change_requests where user_id = p_user and status = 'awaiting_payment' for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'There is no approved change waiting for payment.'); end if;
  select * into m from public.memberships where id = r.membership_id;
  if m.status <> 'active' or (m.ends_on is not null and m.ends_on < private.today()) then
    return jsonb_build_object('ok', false, 'error', 'Your membership is not active, so the change cannot be completed. Write to us from Help.');
  end if;
  if not p_can_charge then return jsonb_build_object('ok', false, 'error', 'Online payment is not switched on yet. Please try again soon.'); end if;
  select * into fp from public.membership_plans where id = r.from_plan_id;
  select * into tp from public.membership_plans where id = r.to_plan_id;
  select * into p from public.profiles where id = p_user;
  v_gst := round(r.charge_paise * tp.gst_percent / 100)::int;
  update public.orders set status = 'cancelled' where membership_id = m.id and status = 'created';
  insert into public.orders (user_id, membership_id, plan_id, plan_name, kind, purpose, payer_name, payer_email, payer_phone,
    base_paise, discount_paise, gst_percent, gst_paise, total_paise, term_years, term_discount_paise, term_label)
  values (p_user, m.id, tp.id, tp.name, 'renewal', 'change', p.full_name, p.email, p.phone,
    r.charge_paise, 0, tp.gst_percent, v_gst, r.charge_paise + v_gst, 1, 0, 'change from ' || fp.name)
  returning id into v_id;
  update public.plan_change_requests set order_id = v_id where id = r.id;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'total_paise', r.charge_paise + v_gst,
    'plan_name', tp.name || ' membership, change from ' || fp.name, 'name', p.full_name, 'email', p.email, 'phone', p.phone);
end $$;
revoke execute on function public.svc_new_change_order(uuid, boolean) from public, anon, authenticated;
grant execute on function public.svc_new_change_order(uuid, boolean) to service_role;

create or replace function private.settle_order(p_order uuid, p_payment text, p_method text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders; m public.memberships; pl public.membership_plans; r public.plan_change_requests; v_d date := private.today(); v_y int; v_fy text;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Order not found.'); end if;
  if o.status in ('paid', 'refunded') then return jsonb_build_object('ok', true, 'already', true); end if;
  v_y := extract(year from v_d)::int - case when extract(month from v_d) < 4 then 1 else 0 end;
  v_fy := v_y::text || '-' || lpad(((v_y + 1) % 100)::text, 2, '0');
  update public.orders set status = 'paid', paid_at = now(), rzp_payment_id = coalesce(p_payment, rzp_payment_id), method = p_method, failure_reason = null,
    receipt_no = 'GRAAS/' || v_fy || '/' || lpad(nextval('private.receipt_no_seq')::text, 5, '0') where id = p_order;
  if o.coupon_code is not null then update public.coupons set used_count = used_count + 1 where code = o.coupon_code; end if;
  select * into m from public.memberships where id = o.membership_id for update;
  if o.purpose = 'change' then
    select * into r from public.plan_change_requests where order_id = o.id and status = 'awaiting_payment' for update;
    if found and m.status = 'active' then
      perform private.apply_change(r.id);
    else
      update public.orders set needs_review = true,
        review_note = 'Payment for a type change received, but the change was no longer waiting. Check, and refund if needed.' where id = p_order;
    end if;
    return jsonb_build_object('ok', true);
  end if;
  select * into pl from public.membership_plans where id = o.plan_id;
  if found and m.id is not null and ((o.kind = 'new' and m.status = 'pending_payment') or (o.kind = 'renewal' and m.status = 'active')) then
    perform private.activate_membership(m.id, o.kind,
      case when pl.duration_months is null then null else pl.duration_months * greatest(o.term_years, 1) end);
  else
    update public.orders set needs_review = true,
      review_note = 'Payment received, but the membership was not waiting for it. Check, and refund if it is a duplicate.' where id = p_order;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.svc_refund_done(p_refund uuid, p_actor uuid, p_rzp_refund text, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.refunds; o public.orders;
begin
  select * into r from public.refunds where id = p_refund for update;
  if not found or r.status <> 'requested' then return; end if;
  if p_rzp_refund is null then
    update public.refunds set status = 'failed', note = left(p_error, 300), decided_by = p_actor, processed_at = now() where id = p_refund;
    return;
  end if;
  update public.refunds set status = 'processed', rzp_refund_id = p_rzp_refund, decided_by = p_actor, processed_at = now() where id = p_refund;
  update public.orders set refunded_paise = refunded_paise + r.amount_paise,
    status = case when refunded_paise + r.amount_paise >= total_paise then 'refunded'::public.order_status else status end
  where id = r.order_id returning * into o;
  if o.status = 'refunded' then
    if o.kind = 'new' and o.purpose = 'membership' then
      update public.memberships set status = 'cancelled', decision_reason = 'Fee refunded' where id = o.membership_id and status in ('pending_payment', 'active', 'suspended');
    elsif o.purpose = 'change' then
      update public.orders set needs_review = true, review_note = 'Type change fee refunded. The member keeps the new type until staff change it back.' where id = o.id;
    else
      update public.orders set needs_review = true, review_note = 'Renewal fee refunded. Adjust the membership end date if needed.' where id = o.id;
    end if;
  end if;
end $$;

create or replace function private.msg_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v jsonb; p public.profiles;
begin
  v := jsonb_build_object(
    'amount', private.inr(new.total_paise),
    'plan', coalesce(new.plan_name || ' membership', 'GRAAS membership') || coalesce(', ' || nullif(new.term_label, '1 year'), ''),
    'receipt_no', coalesce(new.receipt_no, ''),
    'paid_on', private.fmt_date((coalesce(new.paid_at, now()) at time zone 'Asia/Kolkata')::date),
    'reason', coalesce(nullif(trim(new.failure_reason), ''), 'The bank or payment app declined it.'),
    'link', 'https://graas.org.in/account');
  select * into p from public.profiles where id = new.user_id;
  if new.status = 'paid' and old.status is distinct from 'paid' and new.total_paise > 0 then
    perform private.enqueue(new.user_id, 'payment_received', v, 'paid:' || new.id);
    perform private.enqueue_staff('staff_payment_received', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'applicant_email', coalesce(p.email, new.payer_email, ''),
      'kind', case when new.purpose = 'change' then 'membership type change' when new.kind = 'renewal' then 'renewal' else 'new membership' end));
  elsif new.status = 'failed' and old.status = 'created' then
    perform private.enqueue(new.user_id, 'payment_failed', v);
  end if;
  if new.needs_review and not coalesce(old.needs_review, false) then
    perform private.enqueue_staff('staff_payment_review', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'note', coalesce(new.review_note, '')));
  end if;
  return null;
end $$;

-- The account page: also the dropdown lists, the open or latest change request, and estimated fee differences.
create or replace function public.my_account() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'membership', (select (to_jsonb(m) - 'staff_note') || jsonb_build_object('plan', to_jsonb(pl), 'quote', private.quote(pl.id, null, 1),
                     'terms', coalesce((select jsonb_agg(jsonb_build_object('years', t.years, 'label', t.label, 'discount_percent', t.discount_percent,
                                         'quote', private.quote(pl.id, null, t.years)) order by t.sort_order)
                                        from public.membership_terms t
                                        where t.is_published and (t.years = 1 or pl.duration_months = 12)), '[]'::jsonb),
                     'change', (select to_jsonb(r) - 'decided_by' || jsonb_build_object('from_name', fp.name, 'to_name', tp.name, 'to_code', tp.code,
                                         'gst_paise', round(r.charge_paise * tp.gst_percent / 100)::int)
                                from public.plan_change_requests r
                                join public.membership_plans fp on fp.id = r.from_plan_id
                                join public.membership_plans tp on tp.id = r.to_plan_id
                                where r.membership_id = m.id order by r.created_at desc limit 1),
                     'change_options', case when m.status = 'active' then coalesce((
                                select jsonb_agg(jsonb_build_object('code', o.code, 'name', o.name, 'audience', o.audience,
                                         'estimate_paise', private.change_estimate(m.id, o.id)) order by o.sort_order)
                                from public.membership_plans o where o.is_published and o.id <> m.plan_id), '[]'::jsonb) end)
                   from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
                   where m.user_id = (select auth.uid())
                   order by (m.status in ('pending_approval', 'pending_payment', 'active', 'suspended')) desc, m.created_at desc limit 1),
    'orders', coalesce((select jsonb_agg((to_jsonb(o) - 'needs_review' - 'review_note') order by o.created_at desc)
                        from public.orders o where o.user_id = (select auth.uid()) and o.status in ('paid', 'failed', 'refunded')), '[]'::jsonb),
    'tickets', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.tickets t where t.user_id = (select auth.uid())), '[]'::jsonb),
    'referrals', (select count(*) from public.profiles r where r.referred_by = (select referral_code from public.profiles where id = (select auth.uid()))),
    'pay_online', coalesce((select (value->>'enabled')::boolean and (value->>'has_secret')::boolean from public.site_settings where key = 'gateway'), false),
    'is_staff', exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.is_active),
    'options', private.opts(),
    'channels', jsonb_build_object(
      'email', private.email_on(),
      'whatsapp', private.wa_codes_on(),
      'email_required', private.email_on() and coalesce((private.msg_settings() -> 'verify' ->> 'email_required')::boolean, true),
      'phone_required', private.wa_codes_on() and coalesce((private.msg_settings() -> 'verify' ->> 'phone_required')::boolean, false)),
    'today', private.today())
$$;

-- Wording for the new messages (editable in Admin, Messages).
insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_lang, wa_category, wa_params, sort) values
('plan_change_received', 'email', 'member', 'Type change request received', 'Sent when a member asks to change their membership type.', true, false,
 'We have your request to change to {{to_plan}}',
 E'Hi {{name}},\n\nWe have your request to change from {{from_plan}} to {{to_plan}}. The GRAAS team will check it and reply within a few working days. Your current membership stays active meanwhile.\n\n[View my membership]({{link}})',
 null, 'en', null, '{}', 38),
('plan_change_approved', 'email', 'member', 'Type change approved, payment due', 'Sent when staff approve a change that has a fee difference.', true, false,
 'Your change to {{to_plan}} is approved: pay {{amount}} to complete it',
 E'Hi {{name}},\n\nYour request to change to {{to_plan}} is approved. To complete it, pay the fee difference of **{{amount}}** from your account. Your member number {{member_no}} and end date {{valid_till}} stay the same.\n\n[Pay and complete the change]({{link}})',
 null, 'en', null, '{}', 39),
('plan_change_approved', 'whatsapp', 'member', 'Type change approved, payment due', null, true, false, null,
 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.',
 'graas_account_update', 'en', 'UTILITY', '{name,topic}', 39),
('plan_change_declined', 'email', 'member', 'Type change declined', 'Sent when staff decline a change request. Includes the reason given.', true, false,
 'Update on your membership change request',
 E'Hi {{name}},\n\nWe cannot change your membership to {{to_plan}} at this time.\n\nReason: {{reason}}\n\nYour {{from_plan}} stays active. Reply to this email if you have questions.',
 null, 'en', null, '{}', 39),
('plan_change_declined', 'whatsapp', 'member', 'Type change declined', null, true, false, null,
 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.',
 'graas_account_update', 'en', 'UTILITY', '{name,topic}', 39),
('plan_change_done', 'email', 'member', 'Type change completed', 'Sent when the new membership type takes effect.', true, false,
 'You are now on {{to_plan}}',
 E'Hi {{name}},\n\nYour membership is now {{to_plan}}. Your member number {{member_no}} and end date {{valid_till}} stay the same. Your member ID and certificate now show the new type.\n\n[View my member ID]({{link}})',
 null, 'en', null, '{}', 39),
('plan_change_done', 'whatsapp', 'member', 'Type change completed', null, true, false, null,
 'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.',
 'graas_account_update', 'en', 'UTILITY', '{name,topic}', 39),
('staff_plan_change', 'email', 'staff', 'Type change request', 'Tells the team when a member asks to change membership type.', true, false,
 'Membership type change request: {{applicant}}',
 E'{{applicant}} ({{applicant_email}}, member {{member_no}}) asks to change from {{from_plan}} to {{to_plan}}.\n\nReason: {{reason}}\n\nSuggested fee difference: {{amount}}.\n\n[Open Admin]({{site}}/admin)',
 null, 'en', null, '{}', 76)
on conflict (event, channel) do nothing;
