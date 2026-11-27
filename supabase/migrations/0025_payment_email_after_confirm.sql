-- 0025 Payment email only after the email is confirmed (27 Nov 2026, Sagar's request).
--
-- Before: signing up created a membership waiting for payment, and the "Ready for payment" email went out at the
-- same moment as the 6-digit code email, before the member had confirmed anything.
-- Now: while email confirmation is required (Admin, Messages) and the member has not confirmed yet, the
-- "Ready for payment" email is held. The moment the member types the code, it is sent. Members who are already
-- confirmed (or when email sending is off) are treated exactly as before.

-- 1. Is this person still to confirm their email, with confirmation switched on? -----------------------------------
create or replace function private.email_check_pending(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.email_on()
     and coalesce((private.msg_settings() -> 'verify' ->> 'email_required')::boolean, true)
     and exists (select 1 from public.profiles where id = p_user and email_verified_at is null)
$$;
revoke all on function private.email_check_pending(uuid) from public, anon, authenticated;

-- 2. The words used in membership messages (shared by both triggers below) ----------------------------------------
create or replace function private.membership_msg_vars(m public.memberships) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pl public.membership_plans; q jsonb;
begin
  select * into pl from public.membership_plans where id = m.plan_id;
  q := private.quote(m.plan_id, null);
  return jsonb_build_object(
    'plan', coalesce(pl.name || ' membership', 'GRAAS membership'),
    'member_no', coalesce(m.member_no, ''),
    'valid_till', case when m.ends_on is null then 'lifetime' else private.fmt_date(m.ends_on) end,
    'reason', coalesce(nullif(trim(m.decision_reason), ''), 'Not given'),
    'amount', case when coalesce((q ->> 'ok')::boolean, false) then private.inr((q ->> 'total_paise')::bigint)
                   else 'the membership fee' end,
    'link', 'https://graas.org.in/account');
end $$;
revoke all on function private.membership_msg_vars(public.memberships) from public, anon, authenticated;

-- 3. Membership messages: same as 0014, except "Ready for payment" waits for a confirmed email --------------------
create or replace function private.msg_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; p public.profiles; v jsonb; v_event text; v_topic text;
begin
  if coalesce(current_setting('graas.quiet', true), '') = '1' then return null; end if;
  select * into pl from public.membership_plans where id = new.plan_id;
  select * into p from public.profiles where id = new.user_id;
  v := private.membership_msg_vars(new);
  if tg_op = 'INSERT' then
    if new.status = 'pending_approval' then
      perform private.enqueue(new.user_id, 'application_received', v);
    elsif new.status = 'pending_payment' and pl.price_inr is null then
      perform private.enqueue(new.user_id, 'application_saved', v);
    elsif new.status = 'pending_payment' and pl.price_inr <> 0 then
      -- Held until the email is confirmed (see msg_email_confirmed).
      if not private.email_check_pending(new.user_id) then
        perform private.enqueue(new.user_id, 'payment_due', v, 'payment-due:' || new.id);
      end if;
    end if;
    perform private.enqueue_staff('staff_new_application', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, ''), 'applicant_email', coalesce(p.email, ''), 'applicant_phone', coalesce(p.phone, ''),
      'next_step', case when new.status = 'pending_approval' then 'It is waiting for your approval.'
                        when pl.price_inr is null then 'This plan needs no approval. The applicant pays once you set the fee.'
                        else 'This plan needs no approval, so the applicant can pay straight away.' end));
    return null;
  end if;
  if new.status is distinct from old.status then
    v_event := case
      when new.status = 'pending_payment' and old.status = 'pending_approval' and pl.price_inr is null then 'application_approved'
      when new.status = 'pending_payment' and old.status = 'pending_approval' and pl.price_inr <> 0 then 'payment_due'
      when new.status = 'active' and old.status in ('pending_approval', 'pending_payment') then 'membership_active'
      when new.status = 'active' and old.status = 'suspended' then 'membership_reinstated'
      when new.status = 'rejected' then 'application_rejected'
      when new.status = 'suspended' then 'membership_suspended'
      when new.status = 'cancelled' then 'membership_cancelled'
    end;
    v_topic := case when old.status in ('pending_approval', 'pending_payment') then 'membership application' else 'membership' end;
    -- An approved application waiting for payment: also held until the email is confirmed.
    if v_event = 'payment_due' and private.email_check_pending(new.user_id) then v_event := null; end if;
  elsif new.status = 'active' and new.ends_on is not null and old.ends_on is not null and new.ends_on > old.ends_on then
    v_event := 'membership_renewed';
    v_topic := 'membership';
  end if;
  if v_event is not null then
    perform private.enqueue(new.user_id, v_event, v || jsonb_build_object('topic', v_topic));
  end if;
  return null;
end $$;

-- 4. When the email is confirmed: send any held "Ready for payment" email -----------------------------------------
create or replace function private.msg_email_confirmed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m public.memberships; pl public.membership_plans;
begin
  if coalesce(current_setting('graas.quiet', true), '') = '1' then return null; end if;
  for m in select * from public.memberships where user_id = new.id and status = 'pending_payment' loop
    select * into pl from public.membership_plans where id = m.plan_id;
    continue when pl.price_inr is null or pl.price_inr = 0;
    -- Never twice: skip if a payment email for this application already went out (including ones sent before 0025).
    continue when exists (select 1 from public.messages x
                          where x.user_id = new.id and x.event = 'payment_due' and x.created_at >= m.created_at);
    perform private.enqueue(new.id, 'payment_due', private.membership_msg_vars(m), 'payment-due:' || m.id);
  end loop;
  return null;
end $$;
revoke all on function private.msg_email_confirmed() from public, anon, authenticated;

create or replace trigger profiles_email_confirmed_messages
  after update of email_verified_at on public.profiles
  for each row when (old.email_verified_at is null and new.email_verified_at is not null)
  execute function private.msg_email_confirmed();
