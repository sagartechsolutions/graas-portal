-- 0012 (25 Nov 2026): typed text for "Other" course or branch, the free School Student plan (school students join only
-- through their school's GRAAS chapter), plan-based member number series, and the profile/sign-up functions that use them.
-- Written without the word the connector refuses: functions are replaced in place, columns are added, nothing is removed.

-- 1. Profiles -----------------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists course_other text;
alter table public.profiles add column if not exists branch_other text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles add column if not exists chapter_id uuid;

-- 2. Plans: a number series per plan, and whether people can choose the plan themselves ---------------------------------
alter table public.membership_plans add column if not exists series text;
alter table public.membership_plans add column if not exists self_join boolean not null default true;
alter table public.membership_plans add column if not exists how_to_join text;
update public.membership_plans
   set series = case audience::text when 'student' then 'STU' when 'professional' then 'PRO' when 'institution' then 'INS' else 'IND' end
 where series is null;

-- Published only after the website that understands it is live (see the deploy notes in the build brief).
insert into public.membership_plans (code, audience, name, tagline, duration_months, price_inr, gst_percent, benefits,
                                     requires_approval, is_published, sort_order, series, self_join, how_to_join)
values ('school-student', 'student', 'School Student', 'Free for school students up to Class 12, through their school', 12, 0, 0,
        '["Free membership, renewed each year while at school", "Verified member ID with QR and a membership certificate", "Robotics club, workshops and competitions through the school chapter", "Member-only live sessions made for school students", "A head start before college"]'::jsonb,
        true, false, 5, 'SCH', false,
        'A teacher registers a GRAAS school chapter and adds the students. GRAAS approves them and emails each student a login.')
on conflict (code) do nothing;

-- The school class list: Class 1 to Class 12 (staff can still edit the lists in Admin, Settings).
update public.site_settings
   set value = jsonb_set(value, '{courses}', (
         select jsonb_agg(case when x->>'name' ilike 'school%'
                               then jsonb_build_object('name', 'School (Class 1 to 12)', 'branches', false,
                                      'years', '["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"]'::jsonb)
                               else x end)
         from jsonb_array_elements(value->'courses') x))
 where key = 'profile_options';
update public.profiles set course = 'School (Class 1 to 12)' where course ilike 'school%';

-- 3. Member number series -----------------------------------------------------------------------------------------------
-- New numbers read GRAAS-<series>-<yy>-<number>, for example GRAAS-SCH-26-00001 (school student), GRAAS-STU-26-00001
-- (college student), GRAAS-PRO-26-00002. Chapters: GRAAS-CHAP-26-0001 (college) and GRAAS-SCHL-26-0001 (school).
-- Numbers already issued never change. PRO 00001 is kept free in case member No. 1 asks for the new style.
create table if not exists private.member_series (series text primary key, last_no int not null default 0);
insert into private.member_series (series, last_no) values ('PRO', 1) on conflict (series) do nothing;

create or replace function private.next_series_no(p_series text, p_width int default 5)
returns text language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into private.member_series as s (series, last_no) values (p_series, 1)
  on conflict (series) do update set last_no = s.last_no + 1
  returning last_no into n;
  return 'GRAAS-' || p_series || '-' || to_char(private.today(), 'YY') || '-' || lpad(n::text, p_width, '0');
end $$;
revoke all on function private.next_series_no(text, int) from public, anon, authenticated;

create or replace function private.activate_membership(p_id uuid, p_kind text, p_months integer default null::integer)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.memberships; pl public.membership_plans; v_no text; v_start date; v_end date; v_today date := private.today(); v_months int;
begin
  select * into m from public.memberships where id = p_id for update;
  select * into pl from public.membership_plans where id = m.plan_id;
  v_months := coalesce(p_months, pl.duration_months);
  v_no := m.member_no;
  if v_no is null then
    v_no := private.next_series_no(coalesce(pl.series,
              case pl.audience::text when 'student' then 'STU' when 'professional' then 'PRO' when 'institution' then 'INS' else 'IND' end));
  end if;
  if p_kind = 'renewal' and m.starts_on is not null then
    v_start := m.starts_on;
    v_end := case when v_months is null or m.ends_on is null then null
                  else (greatest(m.ends_on + 1, v_today) + make_interval(months => v_months))::date - 1 end;
  else
    v_start := v_today;
    v_end := case when v_months is null then null else (v_today + make_interval(months => v_months))::date - 1 end;
  end if;
  update public.memberships set status = 'active', member_no = v_no, starts_on = v_start, ends_on = v_end,
    activated_at = coalesce(activated_at, now()) where id = p_id;
end $$;

-- 4. Details: "Other" needs typed text; the school class list is only for students added by their school ----------------
create or replace function private.is_school_course(p_name text) returns boolean
language sql immutable set search_path = '' as $$ select coalesce(p_name ilike 'school%', false) $$;

create or replace function private.check_details(p_audience text, p jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o jsonb := private.opts(); c jsonb;
  v_gender text := nullif(trim(coalesce(p->>'gender', '')), '');
  v_course text := nullif(trim(coalesce(p->>'course', '')), '');
  v_year text := nullif(trim(coalesce(p->>'study_year', '')), '');
  v_branch text := nullif(trim(coalesce(p->>'branch', '')), '');
  v_school boolean := coalesce(p->>'_via', '') = 'school';
begin
  if p_audience not in ('student', 'professional') then return null; end if;
  if v_gender is null or not coalesce((o->'genders') ? v_gender, false) then
    return jsonb_build_object('ok', false, 'field', 'gender', 'error', 'Choose your gender from the list.');
  end if;
  if p_audience = 'student' then
    select x into c from jsonb_array_elements(coalesce(o->'courses', '[]'::jsonb)) x where x->>'name' = v_course limit 1;
    if c is null then return jsonb_build_object('ok', false, 'field', 'course', 'error', 'Choose your course.'); end if;
    if private.is_school_course(v_course) and not v_school then
      return jsonb_build_object('ok', false, 'field', 'course', 'error',
        'School students join free through their school''s GRAAS chapter. Ask a teacher to register your school at graas.org.in/chapters.');
    end if;
    if v_school and not private.is_school_course(v_course) then
      return jsonb_build_object('ok', false, 'field', 'course', 'error', 'Choose the school class.');
    end if;
    if v_course = 'Other' and char_length(trim(coalesce(p->>'course_other', ''))) < 2 then
      return jsonb_build_object('ok', false, 'field', 'course_other', 'error', 'Type the name of your course.');
    end if;
    if v_year is null or not coalesce((c->'years') ? v_year, false) then
      return jsonb_build_object('ok', false, 'field', 'study_year', 'error',
        case when v_school then 'Choose the class.' else 'Choose your year of study.' end);
    end if;
    if coalesce((c->>'branches')::boolean, false) then
      if v_branch is null or not coalesce((o->'branches') ? v_branch, false) then
        return jsonb_build_object('ok', false, 'field', 'branch', 'error', 'Choose your branch.');
      end if;
      if v_branch = 'Other' and char_length(trim(coalesce(p->>'branch_other', ''))) < 2 then
        return jsonb_build_object('ok', false, 'field', 'branch_other', 'error', 'Type the name of your branch.');
      end if;
    end if;
  end if;
  return null;
end $$;

create or replace function private.clean_details(p_audience text, p jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o jsonb := private.opts(); c jsonb;
  v_course text := nullif(trim(coalesce(p->>'course', '')), '');
  v_branch text := nullif(trim(coalesce(p->>'branch', '')), '');
  v_has_branch boolean;
begin
  if p_audience = 'student' then
    select x into c from jsonb_array_elements(coalesce(o->'courses', '[]'::jsonb)) x where x->>'name' = v_course limit 1;
  end if;
  v_has_branch := p_audience = 'student' and coalesce((c->>'branches')::boolean, false);
  return jsonb_build_object(
    'gender', case when p_audience in ('student', 'professional') then nullif(trim(coalesce(p->>'gender', '')), '') end,
    'course', case when p_audience = 'student' then v_course end,
    'course_other', case when p_audience = 'student' and v_course = 'Other' then left(nullif(trim(coalesce(p->>'course_other', '')), ''), 80) end,
    'study_year', case when p_audience = 'student' then nullif(trim(coalesce(p->>'study_year', '')), '') end,
    'branch', case when v_has_branch then v_branch end,
    'branch_other', case when v_has_branch and v_branch = 'Other' then left(nullif(trim(coalesce(p->>'branch_other', '')), ''), 80) end);
end $$;

-- 5. Joining: only plans people may choose themselves ------------------------------------------------------------------
create or replace function private.apply_membership(p_user uuid, p_plan_code text, p_org text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; v_id uuid;
begin
  select * into pl from public.membership_plans where code = p_plan_code and is_published and self_join;
  if not found then return jsonb_build_object('ok', false, 'field', 'plan_code', 'error', 'Choose a membership plan.'); end if;
  if exists (select 1 from public.memberships where user_id = p_user and status in ('pending_approval','pending_payment','active','suspended')) then
    return jsonb_build_object('ok', false, 'error', 'You already have a membership or an application in progress.');
  end if;
  insert into public.memberships (user_id, plan_id, status, organisation)
  values (p_user, pl.id, case when pl.requires_approval then 'pending_approval' else 'pending_payment' end::public.membership_status, nullif(trim(coalesce(p_org, '')), ''))
  returning id into v_id;
  update public.profiles set kind = pl.audience::text where id = p_user;
  if not pl.requires_approval and pl.price_inr = 0 then perform private.activate_membership(v_id, 'new'); end if;
  return jsonb_build_object('ok', true, 'membership_id', v_id);
end $$;

create or replace function public.svc_signup_check(p_data jsonb, p_ip_hash text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pl public.membership_plans; v_dob date; v_name text := trim(coalesce(p_data->>'full_name', '')); v_chk jsonb;
begin
  if not coalesce((select (value->>'signup_open')::boolean from public.site_settings where key = 'membership'), true) then
    return jsonb_build_object('ok', false, 'error', 'New applications are paused for the moment. Please check back soon.');
  end if;
  if (select count(*) from private.signup_log where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'error', 'Too many sign-ups from this network in the last hour. Please try again later.');
  end if;
  select * into pl from public.membership_plans where code = p_data->>'plan_code' and is_published and self_join;
  if not found then return jsonb_build_object('ok', false, 'field', 'plan_code', 'error', 'Choose a membership plan.'); end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then return jsonb_build_object('ok', false, 'field', 'full_name', 'error', 'Enter your full name.'); end if;
  if coalesce(p_data->>'email', '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then return jsonb_build_object('ok', false, 'field', 'email', 'error', 'Enter a valid email address.'); end if;
  if coalesce(p_data->>'phone', '') !~ '^[6-9][0-9]{9}$' then return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a 10-digit Indian mobile number.'); end if;
  if char_length(trim(coalesce(p_data->>'city', ''))) < 2 then return jsonb_build_object('ok', false, 'field', 'city', 'error', 'Enter your city.'); end if;
  if char_length(trim(coalesce(p_data->>'organisation', ''))) < 2 then return jsonb_build_object('ok', false, 'field', 'organisation', 'error', 'Enter your school, college, institution or company.'); end if;
  if pl.audience::text in ('student', 'professional') then
    begin v_dob := (p_data->>'dob')::date; exception when others then v_dob := null; end;
    if v_dob is null or v_dob > (private.today() - interval '5 years')::date or v_dob < date '1920-01-01' then
      return jsonb_build_object('ok', false, 'field', 'dob', 'error', 'Enter your date of birth.');
    end if;
    v_chk := private.check_details(pl.audience::text, p_data - '_via');
    if v_chk is not null then return v_chk; end if;
    if private.is_minor(v_dob) then
      if char_length(trim(coalesce(p_data->>'guardian_name', ''))) < 2 then
        return jsonb_build_object('ok', false, 'field', 'guardian_name', 'error', 'Enter the name of your parent or guardian.');
      end if;
      if coalesce(p_data->>'guardian_phone', '') !~ '^[6-9][0-9]{9}$' then
        return jsonb_build_object('ok', false, 'field', 'guardian_phone', 'error', 'Enter your parent''s or guardian''s 10-digit mobile number.');
      end if;
      if not coalesce((p_data->>'guardian_agree')::boolean, false) then
        return jsonb_build_object('ok', false, 'field', 'guardian_agree', 'error', 'Your parent or guardian needs to agree to your membership. Tick the box once they have.');
      end if;
    end if;
  end if;
  if not coalesce((p_data->>'accept')::boolean, false) then
    return jsonb_build_object('ok', false, 'field', 'accept', 'error', 'Please accept the membership rules and policies to continue.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.svc_signup(p_user uuid, p_data jsonb, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; v jsonb; v_dob date := nullif(p_data->>'dob', '')::date; v_minor boolean;
begin
  select * into pl from public.membership_plans where code = p_data->>'plan_code';
  v := private.clean_details(pl.audience::text, p_data);
  v_minor := pl.audience::text in ('student', 'professional') and private.is_minor(v_dob);
  update public.profiles set
    full_name = trim(p_data->>'full_name'), phone = p_data->>'phone',
    dob = v_dob, city = trim(p_data->>'city'), state = nullif(trim(coalesce(p_data->>'state', '')), ''),
    organisation = trim(p_data->>'organisation'), designation = nullif(trim(coalesce(p_data->>'designation', '')), ''),
    website = nullif(trim(coalesce(p_data->>'website', '')), ''),
    gender = v->>'gender', course = v->>'course', course_other = v->>'course_other', branch = v->>'branch', branch_other = v->>'branch_other',
    study_year = v->>'study_year',
    guardian_name = case when v_minor then left(trim(p_data->>'guardian_name'), 80) end,
    guardian_phone = case when v_minor then p_data->>'guardian_phone' end,
    guardian_consent_at = case when v_minor then now() end,
    referral_code = coalesce(referral_code, upper(substr(md5(gen_random_uuid()::text), 1, 8))),
    referred_by = nullif(upper(trim(coalesce(p_data->>'ref', ''))), ''), accepted_terms_at = now()
  where id = p_user;
  insert into private.signup_log (ip_hash) values (p_ip_hash);
  return private.apply_membership(p_user, p_data->>'plan_code', p_data->>'organisation');
end $$;

-- 6. Profile, re-apply, switch and change requests keep the typed "Other" text ------------------------------------------
create or replace function public.member_update_profile(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pr public.profiles; v jsonb; v_chk jsonb; v_school boolean; q jsonb;
begin
  select * into pr from public.profiles where id = (select auth.uid());
  if not found then return jsonb_build_object('ok', false, 'error', 'Please sign in again.'); end if;
  v_school := exists (select 1 from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
                      where m.user_id = pr.id and pl.code = 'school-student'
                        and m.status in ('pending_approval', 'pending_payment', 'active', 'suspended'));
  q := (p - '_via') || case when v_school then jsonb_build_object('_via', 'school') else '{}'::jsonb end;
  if char_length(trim(coalesce(q->>'full_name', ''))) < 2 then return jsonb_build_object('ok', false, 'field', 'full_name', 'error', 'Enter your full name.'); end if;
  if coalesce(q->>'phone', '') !~ '^[6-9][0-9]{9}$' then return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a 10-digit Indian mobile number.'); end if;
  if pr.kind in ('student', 'professional') then
    v_chk := private.check_details(pr.kind, q);
    if v_chk is not null then return v_chk; end if;
  end if;
  if private.is_minor(pr.dob) and pr.kind in ('student', 'professional') then
    if char_length(trim(coalesce(q->>'guardian_name', ''))) < 2 then
      return jsonb_build_object('ok', false, 'field', 'guardian_name', 'error', 'Enter the name of your parent or guardian.');
    end if;
    if coalesce(q->>'guardian_phone', '') !~ '^[6-9][0-9]{9}$' then
      return jsonb_build_object('ok', false, 'field', 'guardian_phone', 'error', 'Enter your parent''s or guardian''s 10-digit mobile number.');
    end if;
  end if;
  v := private.clean_details(pr.kind, q);
  update public.profiles set full_name = left(trim(q->>'full_name'), 80), phone = q->>'phone',
    city = left(nullif(trim(coalesce(q->>'city', '')), ''), 80), state = left(nullif(trim(coalesce(q->>'state', '')), ''), 60),
    organisation = left(nullif(trim(coalesce(q->>'organisation', '')), ''), 120), designation = left(nullif(trim(coalesce(q->>'designation', '')), ''), 120),
    website = left(nullif(trim(coalesce(q->>'website', '')), ''), 160),
    gender = case when pr.kind in ('student', 'professional') then v->>'gender' else gender end,
    course = case when pr.kind in ('student', 'professional') then v->>'course' else course end,
    course_other = case when pr.kind in ('student', 'professional') then v->>'course_other' else course_other end,
    branch = case when pr.kind in ('student', 'professional') then v->>'branch' else branch end,
    branch_other = case when pr.kind in ('student', 'professional') then v->>'branch_other' else branch_other end,
    study_year = case when pr.kind in ('student', 'professional') then v->>'study_year' else study_year end,
    guardian_name = case when private.is_minor(pr.dob) then left(trim(q->>'guardian_name'), 80) else guardian_name end,
    guardian_phone = case when private.is_minor(pr.dob) then q->>'guardian_phone' else guardian_phone end
  where id = pr.id;
  update public.memberships set organisation = left(nullif(trim(coalesce(q->>'organisation', '')), ''), 120)
  where user_id = pr.id and status in ('pending_approval', 'pending_payment', 'active', 'suspended')
    and nullif(trim(coalesce(q->>'organisation', '')), '') is not null;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.member_reapply(p_plan_code text, p_org text default null::text, p_details jsonb default null::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; merged jsonb; v jsonb; v_chk jsonb;
begin
  if (select auth.uid()) is null then return jsonb_build_object('ok', false, 'error', 'Please sign in.'); end if;
  select * into pl from public.membership_plans where code = p_plan_code and is_published and self_join;
  if found and p_details is not null then
    merged := (select to_jsonb(pr) from public.profiles pr where pr.id = (select auth.uid())) || (p_details - '_via');
    v_chk := private.check_details(pl.audience::text, merged);
    if v_chk is not null then return v_chk; end if;
    v := private.clean_details(pl.audience::text, merged);
    update public.profiles set gender = coalesce(v->>'gender', gender), course = v->>'course', course_other = v->>'course_other',
      branch = v->>'branch', branch_other = v->>'branch_other', study_year = v->>'study_year',
      designation = coalesce(nullif(trim(coalesce(p_details->>'designation', '')), ''), designation)
    where id = (select auth.uid());
  end if;
  update public.profiles set organisation = coalesce(nullif(trim(coalesce(p_org, '')), ''), organisation),
    referral_code = coalesce(referral_code, upper(substr(md5(gen_random_uuid()::text), 1, 8))), accepted_terms_at = coalesce(accepted_terms_at, now())
  where id = (select auth.uid());
  return private.apply_membership((select auth.uid()), p_plan_code, p_org);
end $$;

create or replace function public.member_switch_type(p_plan_code text, p_details jsonb default null::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.memberships; pl public.membership_plans; merged jsonb; v jsonb; v_chk jsonb;
begin
  select * into m from public.memberships where user_id = (select auth.uid()) and status in ('pending_approval', 'pending_payment') for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'The type can be changed here only before payment. After payment, send a change request.'); end if;
  select * into pl from public.membership_plans where code = p_plan_code and is_published and self_join;
  if not found then return jsonb_build_object('ok', false, 'error', 'That plan is not available.'); end if;
  if p_details is not null then
    merged := (select to_jsonb(pr) from public.profiles pr where pr.id = m.user_id) || (p_details - '_via');
    v_chk := private.check_details(pl.audience::text, merged);
    if v_chk is not null then return v_chk; end if;
    if char_length(trim(coalesce(merged->>'organisation', ''))) < 2 then
      return jsonb_build_object('ok', false, 'field', 'organisation', 'error', 'Enter your school, college, institution or company.');
    end if;
    v := private.clean_details(pl.audience::text, merged);
    update public.profiles set organisation = left(trim(merged->>'organisation'), 120),
      designation = left(nullif(trim(coalesce(merged->>'designation', '')), ''), 120),
      gender = coalesce(v->>'gender', gender), course = v->>'course', course_other = v->>'course_other',
      branch = v->>'branch', branch_other = v->>'branch_other', study_year = v->>'study_year'
    where id = m.user_id;
    update public.memberships set organisation = left(trim(merged->>'organisation'), 120) where id = m.id;
  end if;
  update public.orders set status = 'cancelled' where membership_id = m.id and status = 'created';
  update public.memberships set plan_id = pl.id, approved_at = null, approved_by = null,
    status = case when pl.requires_approval then 'pending_approval' else 'pending_payment' end::public.membership_status where id = m.id;
  update public.profiles set kind = pl.audience::text where id = m.user_id;
  if not pl.requires_approval and pl.price_inr = 0 then perform private.activate_membership(m.id, 'new'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.member_request_change(p_plan_code text, p_details jsonb default '{}'::jsonb, p_reason text default null::text)
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
  select * into tp from public.membership_plans where code = p_plan_code and is_published and self_join;
  if not found then return jsonb_build_object('ok', false, 'field', 'plan', 'error', 'Choose the membership you want.'); end if;
  if tp.id = m.plan_id then return jsonb_build_object('ok', false, 'field', 'plan', 'error', 'That is already your membership.'); end if;
  select * into pr from public.profiles where id = m.user_id;
  merged := to_jsonb(pr) || (coalesce(p_details, '{}'::jsonb) - '_via');
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

create or replace function private.apply_change(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
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
    gender = coalesce(v->>'gender', gender), course = v->>'course', course_other = v->>'course_other',
    branch = v->>'branch', branch_other = v->>'branch_other', study_year = v->>'study_year'
  where id = r.user_id;
  update public.plan_change_requests set status = 'done', completed_at = now() where id = p_id;
  select * into r from public.plan_change_requests where id = p_id;
  perform private.enqueue(r.user_id, 'plan_change_done', private.change_vars(r), 'change-done:' || r.id);
end $$;
