-- 0014 (25 Nov 2026): chapter seat payments, automatic student logins, chapter messages, and chapters in the member
-- account, the public check and the staff dashboard. Written without the word the connector refuses.

-- 1. Accounts made for chapter students or coordinators never pick up a staff invitation ------------------------------------
create or replace function private.handle_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update set email = excluded.email;
  if new.email_confirmed_at is not null
     and coalesce(new.raw_app_meta_data->>'via', '') not in ('member_signup', 'chapter_roster', 'chapter_head') then
    insert into public.staff_members (user_id, role)
    select new.id, i.role from private.admin_invites i where lower(i.email) = lower(new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

-- 2. Messages stay quiet while a chapter login is being set up (the login email says it all) ----------------------------
create or replace function private.msg_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; p public.profiles; v jsonb; q jsonb; v_event text; v_topic text;
begin
  if coalesce(current_setting('graas.quiet', true), '') = '1' then return null; end if;
  select * into pl from public.membership_plans where id = new.plan_id;
  select * into p from public.profiles where id = new.user_id;
  q := private.quote(new.plan_id, null);
  v := jsonb_build_object(
    'plan', coalesce(pl.name || ' membership', 'GRAAS membership'),
    'member_no', coalesce(new.member_no, ''),
    'valid_till', case when new.ends_on is null then 'lifetime' else private.fmt_date(new.ends_on) end,
    'reason', coalesce(nullif(trim(new.decision_reason), ''), 'Not given'),
    'amount', case when coalesce((q ->> 'ok')::boolean, false) then private.inr((q ->> 'total_paise')::bigint)
                   else 'the membership fee' end,
    'link', 'https://graas.org.in/account');
  if tg_op = 'INSERT' then
    if new.status = 'pending_approval' then
      perform private.enqueue(new.user_id, 'application_received', v);
    elsif new.status = 'pending_payment' and pl.price_inr is null then
      perform private.enqueue(new.user_id, 'application_saved', v);
    elsif new.status = 'pending_payment' and pl.price_inr <> 0 then
      perform private.enqueue(new.user_id, 'payment_due', v);
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
  elsif new.status = 'active' and new.ends_on is not null and old.ends_on is not null and new.ends_on > old.ends_on then
    v_event := 'membership_renewed';
    v_topic := 'membership';
  end if;
  if v_event is not null then
    perform private.enqueue(new.user_id, v_event, v || jsonb_build_object('topic', v_topic));
  end if;
  return null;
end $$;

create or replace function private.msg_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v jsonb; p public.profiles; v_plan text;
begin
  v_plan := case when new.chapter_id is not null
                 then 'GRAAS chapter membership for ' || coalesce(new.seats, 0) || case when coalesce(new.seats, 0) = 1 then ' student' else ' students' end
                 else coalesce(new.plan_name || ' membership', 'GRAAS membership') || coalesce(', ' || nullif(new.term_label, '1 year'), '') end;
  v := jsonb_build_object(
    'amount', private.inr(new.total_paise),
    'plan', v_plan,
    'receipt_no', coalesce(new.receipt_no, ''),
    'paid_on', private.fmt_date((coalesce(new.paid_at, now()) at time zone 'Asia/Kolkata')::date),
    'reason', coalesce(nullif(trim(new.failure_reason), ''), 'The bank or payment app declined it.'),
    'link', case when new.chapter_id is not null then 'https://graas.org.in/chapter' else 'https://graas.org.in/account' end);
  select * into p from public.profiles where id = new.user_id;
  if new.status = 'paid' and old.status is distinct from 'paid' and new.total_paise > 0 then
    perform private.enqueue(new.user_id, 'payment_received', v, 'paid:' || new.id);
    perform private.enqueue_staff('staff_payment_received', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'applicant_email', coalesce(p.email, new.payer_email, ''),
      'kind', case when new.chapter_id is not null then 'chapter seats' when new.purpose = 'change' then 'membership type change'
                   when new.kind = 'renewal' then 'renewal' else 'new membership' end));
  elsif new.status = 'failed' and old.status = 'created' then
    perform private.enqueue(new.user_id, 'payment_failed', v);
  end if;
  if new.needs_review and not coalesce(old.needs_review, false) then
    perform private.enqueue_staff('staff_payment_review', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'note', coalesce(new.review_note, '')));
  end if;
  return null;
end $$;

-- 3. Paying for students beyond the free seats, in one payment ------------------------------------------------------------
create or replace function public.svc_new_chapter_order(p_user uuid, p_ids uuid[], p_can_charge boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; pl public.membership_plans; q jsonb; n int; v_id uuid; p public.profiles; v_total int;
begin
  select * into c from public.chapters where head_user = p_user and status = 'approved' order by created_at desc limit 1;
  if not found then return private.err(null, 'Only the coordinator of an approved chapter can pay for students.'); end if;
  select * into pl from public.membership_plans where code = 'student-annual';
  q := private.quote(pl.id, null, 1);
  if not coalesce((q->>'ok')::boolean, false) then return q; end if;
  select count(*) into n from public.chapter_members where chapter_id = c.id and status = 'awaiting_payment' and id = any (coalesce(p_ids, '{}'));
  if n = 0 then return private.err(null, 'Choose the students to pay for.'); end if;
  v_total := (q->>'total_paise')::int * n;
  if v_total > 0 and not p_can_charge then return private.err(null, 'Online payment is not switched on yet. Please try again soon.'); end if;
  select * into p from public.profiles where id = p_user;
  update public.orders set status = 'cancelled' where chapter_id = c.id and status = 'created';
  update public.chapter_members set order_id = null where chapter_id = c.id and status = 'awaiting_payment' and order_id is not null;
  insert into public.orders (user_id, membership_id, plan_id, plan_name, kind, payer_name, payer_email, payer_phone,
    base_paise, discount_paise, gst_percent, gst_paise, total_paise, coupon_code, term_years, term_discount_paise, term_label, chapter_id, seats)
  values (p_user, null, pl.id, 'Chapter seats', 'new', p.full_name, p.email, p.phone,
    (q->>'base_paise')::int * n, 0, (q->>'gst_percent')::numeric, (q->>'gst_paise')::int * n, v_total, null, 1, 0, '1 year', c.id, n)
  returning id into v_id;
  update public.chapter_members set order_id = v_id where chapter_id = c.id and status = 'awaiting_payment' and id = any (coalesce(p_ids, '{}'));
  if v_total = 0 then
    perform private.settle_order(v_id, null, 'no charge');
    return jsonb_build_object('ok', true, 'free', true);
  end if;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'total_paise', v_total, 'chapter_id', c.id,
    'plan_name', 'GRAAS chapter membership for ' || n || case when n = 1 then ' student' else ' students' end,
    'name', p.full_name, 'email', p.email, 'phone', p.phone);
end $$;

create or replace function private.settle_order(p_order uuid, p_payment text, p_method text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders; m public.memberships; pl public.membership_plans; r public.plan_change_requests; v_d date := private.today(); v_y int; v_fy text; v_n int;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Order not found.'); end if;
  if o.status in ('paid', 'refunded') then return jsonb_build_object('ok', true, 'already', true); end if;
  v_y := extract(year from v_d)::int - case when extract(month from v_d) < 4 then 1 else 0 end;
  v_fy := v_y::text || '-' || lpad(((v_y + 1) % 100)::text, 2, '0');
  update public.orders set status = 'paid', paid_at = now(), rzp_payment_id = coalesce(p_payment, rzp_payment_id), method = p_method, failure_reason = null,
    receipt_no = 'GRAAS/' || v_fy || '/' || lpad(nextval('private.receipt_no_seq')::text, 5, '0') where id = p_order;
  if o.coupon_code is not null then update public.coupons set used_count = used_count + 1 where code = o.coupon_code; end if;
  if o.chapter_id is not null then
    -- Chapter seats: the students paid for get their logins next (the database wakes the sender).
    update public.chapter_members set status = 'ready', seat = 'paid'
     where order_id = o.id and status = 'awaiting_payment';
    get diagnostics v_n = row_count;
    if v_n < coalesce(o.seats, 0) then
      update public.orders set needs_review = true,
        review_note = 'Chapter seat payment received for ' || o.seats || ' students, but only ' || v_n
                      || ' were still waiting. Check, and refund the difference if needed.' where id = p_order;
    end if;
    return jsonb_build_object('ok', true, 'chapter_id', o.chapter_id, 'seats', v_n);
  end if;
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

-- 4. Setting up student logins (called by the server only) --------------------------------------------------------------
create or replace function public.svc_roster_claim(p_chapter uuid, p_limit int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  update public.chapter_members set status = 'ready' where status = 'provisioning' and updated_at < now() - interval '10 minutes';
  with picked as (
    select r.id from public.chapter_members r join public.chapters c on c.id = r.chapter_id
    where r.status = 'ready' and c.status = 'approved' and (p_chapter is null or r.chapter_id = p_chapter)
    order by r.created_at
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    for update of r skip locked),
  upd as (
    update public.chapter_members r set status = 'provisioning' from picked where r.id = picked.id
    returning r.id, r.email, r.full_name, r.seat, r.chapter_id)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'full_name', full_name, 'seat', seat, 'chapter_id', chapter_id)), '[]'::jsonb)
    into res from upd;
  return res;
end $$;

create or replace function public.svc_roster_activate(p_row uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.chapter_members; c public.chapters; pl public.membership_plans; v_mid uuid; v_no text; v_minor boolean;
begin
  select * into r from public.chapter_members where id = p_row for update;
  if not found or r.status <> 'provisioning' then return private.err(null, 'This student is not waiting for a login.'); end if;
  select * into c from public.chapters where id = r.chapter_id;
  select * into pl from public.membership_plans where code = case c.kind when 'school' then 'school-student' else 'student-annual' end;
  if not found then return private.err(null, 'The membership plan for chapter students is missing.'); end if;
  perform set_config('graas.quiet', '1', true);
  v_minor := private.is_minor(r.dob);
  update public.profiles set full_name = r.full_name, phone = r.phone, dob = r.dob, gender = r.gender,
    course = r.course, course_other = r.course_other, branch = r.branch, branch_other = r.branch_other, study_year = r.study_year,
    city = c.city, state = c.state, organisation = c.institution, kind = 'student',
    guardian_name = r.guardian_name, guardian_phone = r.guardian_phone, guardian_consent_at = case when v_minor then now() end,
    chapter_id = c.id, must_change_password = true, email_verified_at = now(),
    referral_code = coalesce(referral_code, upper(substr(md5(gen_random_uuid()::text), 1, 8)))
  where id = p_user;
  insert into public.memberships (user_id, plan_id, status, organisation, is_complimentary, approved_at, approved_by, staff_note)
  values (p_user, pl.id, 'pending_payment', c.institution, r.seat = 'free', now(), r.decided_by,
          'Chapter ' || coalesce(c.code, '') || case r.seat when 'free' then ': free seat' when 'paid' then ': paid by the chapter' else ': member pays' end)
  returning id into v_mid;
  if r.seat in ('free', 'paid') then perform private.activate_membership(v_mid, 'new'); end if;
  select member_no into v_no from public.memberships where id = v_mid;
  update public.chapter_members set status = 'active', user_id = p_user, membership_id = v_mid, login_error = null where id = p_row;
  return jsonb_build_object('ok', true, 'member_no', coalesce(v_no, ''), 'plan', pl.name || ' membership', 'chapter', private.chapter_label(c),
    'pay', r.seat = 'self',
    'amount', case when r.seat = 'self' then private.inr(((private.quote(pl.id, null, 1))->>'total_paise')::bigint) end);
end $$;

create or replace function public.svc_roster_sent(p_row uuid, p_ok boolean, p_error text) returns void
language sql security definer set search_path = '' as $$
  update public.chapter_members set login_sent_at = case when p_ok then now() else login_sent_at end,
    login_error = case when p_ok then null else left(p_error, 300) end where id = p_row
$$;

create or replace function public.svc_roster_failed(p_row uuid, p_error text) returns void
language sql security definer set search_path = '' as $$
  update public.chapter_members set status = 'failed', login_error = left(p_error, 300) where id = p_row and status = 'provisioning'
$$;

-- Who may resend a first login: the chapter's coordinator or chapter staff, and only before the student has signed in.
create or replace function public.svc_roster_resend_info(p_row uuid, p_actor uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.chapter_members; c public.chapters; p public.profiles; m public.memberships; pl public.membership_plans;
begin
  select * into r from public.chapter_members where id = p_row;
  if not found then return private.err(null, 'Student not found.'); end if;
  select * into c from public.chapters where id = r.chapter_id;
  if c.head_user is distinct from p_actor and not exists (
       select 1 from public.staff_members s where s.user_id = p_actor and s.is_active and s.role in ('super_admin', 'chapter_manager', 'membership_desk')) then
    return private.err(null, 'Only the chapter coordinator or GRAAS staff can do this.');
  end if;
  if r.status <> 'active' or r.user_id is null then return private.err(null, 'This student does not have a login yet.'); end if;
  select * into p from public.profiles where id = r.user_id;
  if not coalesce(p.must_change_password, false) then
    return private.err(null, 'This student has already signed in and chosen a password. If they forgot it, they can use Forgot password.');
  end if;
  select * into m from public.memberships where id = r.membership_id;
  select * into pl from public.membership_plans where id = m.plan_id;
  return jsonb_build_object('ok', true, 'user_id', p.id, 'email', p.email, 'full_name', p.full_name, 'member_no', coalesce(m.member_no, ''),
    'plan', coalesce(pl.name, 'Student') || ' membership', 'chapter', private.chapter_label(c), 'pay', r.seat = 'self' and m.status = 'pending_payment',
    'amount', case when r.seat = 'self' then private.inr(((private.quote(pl.id, null, 1))->>'total_paise')::bigint) end);
end $$;

create or replace function public.svc_first_password_done(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.profiles set must_change_password = false, accepted_terms_at = coalesce(accepted_terms_at, now())
   where id = p_user and must_change_password;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke execute on function public.svc_new_chapter_order(uuid, uuid[], boolean), public.svc_roster_claim(uuid, int),
  public.svc_roster_activate(uuid, uuid), public.svc_roster_sent(uuid, boolean, text), public.svc_roster_failed(uuid, text),
  public.svc_roster_resend_info(uuid, uuid), public.svc_first_password_done(uuid) from public, anon, authenticated;
grant execute on function public.svc_new_chapter_order(uuid, uuid[], boolean), public.svc_roster_claim(uuid, int),
  public.svc_roster_activate(uuid, uuid), public.svc_roster_sent(uuid, boolean, text), public.svc_roster_failed(uuid, text),
  public.svc_roster_resend_info(uuid, uuid), public.svc_first_password_done(uuid) to service_role;

-- 5. Wake the sender when students are ready for their logins -----------------------------------------------------------
create or replace function private.kick_dispatch() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('graas.kicked', true), '') = '1' then return; end if;
  if not exists (select 1 from public.messages where status = 'queued' and send_after <= now())
     and not exists (select 1 from public.chapter_members r join public.chapters c on c.id = r.chapter_id
                     where c.status = 'approved' and (r.status = 'ready' or (r.status = 'provisioning' and r.updated_at < now() - interval '10 minutes'))) then
    return;
  end if;
  perform set_config('graas.kicked', '1', true);
  perform net.http_post(
    url := 'https://txiohgergoxxtfjsyqva.supabase.co/functions/v1/notify',
    body := '{}'::jsonb,
    headers := jsonb_build_object('content-type', 'application/json',
                                  'x-notify-key', (select value from private.app_secrets where key = 'notify_key')),
    timeout_milliseconds := 8000);
end $$;

create trigger chapter_members_kick after update of status on public.chapter_members
  for each row when (new.status = 'ready' and old.status is distinct from 'ready')
  execute function private.msg_kick_trigger();

-- 6. What members, the public check and staff see ------------------------------------------------------------------------
create or replace function public.my_account() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'membership', (select (to_jsonb(m) - 'staff_note') || jsonb_build_object('plan', to_jsonb(pl), 'quote', private.quote(pl.id, null, 1),
                     'terms', coalesce((select jsonb_agg(jsonb_build_object('years', t.years, 'label', t.label, 'discount_percent', t.discount_percent,
                                         'quote', private.quote(pl.id, null, t.years)) order by t.sort_order)
                                        from public.membership_terms t
                                        where t.is_published and (t.years = 1 or pl.duration_months = 12) and pl.self_join), '[]'::jsonb),
                     'change', (select to_jsonb(r) - 'decided_by' || jsonb_build_object('from_name', fp.name, 'to_name', tp.name, 'to_code', tp.code,
                                         'gst_paise', round(r.charge_paise * tp.gst_percent / 100)::int)
                                from public.plan_change_requests r
                                join public.membership_plans fp on fp.id = r.from_plan_id
                                join public.membership_plans tp on tp.id = r.to_plan_id
                                where r.membership_id = m.id order by r.created_at desc limit 1),
                     'change_options', case when m.status = 'active' then coalesce((
                                select jsonb_agg(jsonb_build_object('code', o.code, 'name', o.name, 'audience', o.audience,
                                         'estimate_paise', private.change_estimate(m.id, o.id)) order by o.sort_order)
                                from public.membership_plans o where o.is_published and o.self_join and o.id <> m.plan_id), '[]'::jsonb) end)
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
    'chapter_member', (select jsonb_build_object('label', private.chapter_label(c), 'code', c.code, 'kind', c.kind, 'head', c.head_name)
                       from public.chapters c where c.id = (select chapter_id from public.profiles where id = (select auth.uid()))),
    'my_chapter', (select jsonb_build_object('id', c.id, 'status', c.status, 'label', private.chapter_label(c), 'code', c.code, 'kind', c.kind)
                   from public.chapters c where c.head_user = (select auth.uid()) order by c.created_at desc limit 1),
    'channels', jsonb_build_object(
      'email', private.email_on(),
      'whatsapp', private.wa_codes_on(),
      'email_required', private.email_on() and coalesce((private.msg_settings() -> 'verify' ->> 'email_required')::boolean, true),
      'phone_required', private.wa_codes_on() and coalesce((private.msg_settings() -> 'verify' ->> 'phone_required')::boolean, false)),
    'today', private.today())
$$;

create or replace function public.verify_member(p_no text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('found', true, 'kind', 'member', 'member_no', m.member_no, 'name', p.full_name, 'plan', pl.name, 'audience', pl.audience,
       'organisation', case when pl.audience::text in ('institution', 'industry') then m.organisation end,
       'chapter', (select private.chapter_label(c) from public.chapters c where c.id = p.chapter_id and c.status = 'approved'),
       'state', case when m.status = 'suspended' then 'suspended'
                     when m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today()) then 'active'
                     when m.status = 'active' then 'expired' else 'inactive' end,
       'member_since', m.starts_on, 'valid_until', m.ends_on)
     from public.memberships m join public.profiles p on p.id = m.user_id join public.membership_plans pl on pl.id = m.plan_id
     where m.member_no = upper(trim(p_no)) limit 1),
    (select jsonb_build_object('found', true, 'kind', 'chapter', 'member_no', c.code, 'name', private.chapter_label(c),
       'plan', case c.kind when 'school' then 'School chapter' else 'College chapter' end, 'audience', 'chapter',
       'organisation', c.institution, 'chapter', null,
       'members', (select count(*) from public.chapter_members r where r.chapter_id = c.id and r.status = 'active'),
       'state', case when c.status = 'suspended' then 'suspended'
                     when c.status = 'approved' and (c.valid_until is null or c.valid_until >= private.today()) then 'active'
                     when c.status = 'approved' then 'expired' else 'inactive' end,
       'member_since', c.approved_at::date, 'valid_until', c.valid_until)
     from public.chapters c where c.code = upper(trim(p_no)) limit 1),
    jsonb_build_object('found', false))
$$;

create or replace function public.staff_dashboard() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not private.is_staff() then null else jsonb_build_object(
    'accounts', (select count(*) from public.profiles),
    'active', (select count(*) from public.memberships where status = 'active' and (ends_on is null or ends_on >= private.today())),
    'expired', (select count(*) from public.memberships where status = 'active' and ends_on < private.today()),
    'expiring_30', (select count(*) from public.memberships where status = 'active' and ends_on between private.today() and private.today() + 30),
    'pending_approval', (select count(*) from public.memberships where status = 'pending_approval'),
    'pending_payment', (select count(*) from public.memberships where status = 'pending_payment'),
    'suspended', (select count(*) from public.memberships where status = 'suspended'),
    'applied_7d', (select count(*) from public.memberships where applied_at > now() - interval '7 days'),
    'by_audience', (select coalesce(jsonb_object_agg(a, n), '{}'::jsonb) from (
        select case when pl.code = 'school-student' then 'school' else pl.audience::text end a, count(*) n
        from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
        where m.status = 'active' group by 1) t),
    'collected_paise', (select coalesce(sum(total_paise - refunded_paise), 0) from public.orders where status in ('paid','refunded')),
    'collected_month_paise', (select coalesce(sum(total_paise - refunded_paise), 0) from public.orders
        where status in ('paid','refunded') and (paid_at at time zone 'Asia/Kolkata') >= date_trunc('month', now() at time zone 'Asia/Kolkata')),
    'paid_orders', (select count(*) from public.orders where status in ('paid','refunded')),
    'needs_review', (select count(*) from public.orders where needs_review and status = 'paid'),
    'refund_requests', (select count(*) from public.refunds where status = 'requested'),
    'open_tickets', (select count(*) from public.tickets where status = 'open'),
    'enquiries_new', (select count(*) from public.leads where status::text = 'new'),
    'fees_missing', (select count(*) from public.membership_plans where is_published and price_inr is null),
    'policies_saved', (select count(*) from public.policies),
    'chapters_waiting', (select count(*) from public.chapters where status = 'submitted'),
    'chapters_active', (select count(*) from public.chapters where status = 'approved'),
    'roster_waiting', (select count(*) from public.chapter_members r join public.chapters c on c.id = r.chapter_id
                       where r.status = 'pending' and c.status = 'approved'),
    'roster_failed', (select count(*) from public.chapter_members where status = 'failed' or (status = 'active' and login_sent_at is null and login_error is not null)),
    'gateway', (select value from public.site_settings where key = 'gateway'),
    'org', (select value from public.site_settings where key = 'org'),
    'as_of', now()) end
$$;

-- 7. Message wording ----------------------------------------------------------------------------------------------------
insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_lang, wa_category, wa_params, sort) values
('chapter_member_login', 'email', 'member', 'Chapter student: first login', 'Sent once to each student a chapter adds, when GRAAS approves them. Holds a first password the student changes at sign-in.', true, true,
 'Your GRAAS membership is ready: sign in with this login',
 E'Hi {{name}},\n\n{{chapter}} has made you a member of GRAAS, the Global Robotics And Automation Society. Your membership is **{{plan}}** and your member number is **{{member_no}}**.\n\nSign in at graas.org.in with:\n\n**Login ID:** {{login}}\n**First password:** {{password}}\n\n{{next_step}}\n\n[Sign in to GRAAS]({{link}})\n\nWhen you sign in, you choose your own password. Then add your photo and check your details: your membership certificate is ready as soon as your profile is complete.',
 null, 'en', null, '{}', 60),
('chapter_submitted', 'email', 'member', 'Chapter application received', 'Sent to the coordinator when a chapter application is sent to GRAAS.', true, false,
 'We have your application for {{chapter}}',
 E'Hi {{name}},\n\nThank you. Your application for **{{chapter}}**, with {{count}} students on the list, is with the GRAAS team. We check the principal''s letter and the details, and reply within a few working days.\n\n[Open the chapter console]({{link}})',
 null, 'en', null, '{}', 61),
('chapter_approved', 'email', 'member', 'Chapter approved', 'Sent to the coordinator when GRAAS approves a chapter.', true, false,
 '{{chapter}} is now a GRAAS chapter',
 E'Hi {{name}},\n\nCongratulations. **{{chapter}}** is approved. Its chapter number is **{{code}}** and the chapter membership runs until {{valid_till}}.\n\nEvery approved student now gets their own GRAAS login by email. From the chapter console you can follow who has signed in, add more students, pay for extra seats and print the chapter certificate.\n\n[Open the chapter console]({{link}})',
 null, 'en', null, '{}', 62),
('chapter_rejected', 'email', 'member', 'Chapter needs changes', 'Sent to the coordinator when GRAAS sends a chapter application back. Includes the reason.', true, false,
 'Your chapter application needs a change',
 E'Hi {{name}},\n\nWe looked at your application for **{{chapter}}** and need a change before we can approve it:\n\n{{reason}}\n\nOpen the chapter console, make the change and send it again.\n\n[Open the chapter console]({{link}})',
 null, 'en', null, '{}', 63),
('staff_chapter_new', 'email', 'staff', 'New chapter application', 'Staff alert when a chapter application arrives.', true, false,
 'New {{kind}} application: {{chapter}}',
 E'A new chapter application is waiting.\n\n**Chapter:** {{chapter}}\n**Coordinator:** {{applicant}}, {{applicant_email}}, {{applicant_phone}}\n**Students on the list:** {{count}}\n\nCheck the principal''s letter and the student list in Admin, Chapters.\n\n[Open Admin]({{link}})',
 null, 'en', null, '{}', 64),
('staff_roster_pending', 'email', 'staff', 'Chapter students waiting', 'Staff alert when an approved chapter adds students who need approval.', true, false,
 '{{count}} students waiting: {{chapter}}',
 E'{{chapter}} ({{code}}) has added {{count}} students who need approval.\n\n[Open Admin]({{link}})',
 null, 'en', null, '{}', 65)
on conflict do nothing;
