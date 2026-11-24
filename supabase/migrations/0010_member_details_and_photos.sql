-- Student details (course, branch, year), gender, parent or guardian for under-18s, member photos.
-- The 18+ rule is removed: under-18s join with a parent's or guardian's agreement.

alter table public.profiles
  add column if not exists gender text,
  add column if not exists course text,
  add column if not exists branch text,
  add column if not exists study_year text,
  add column if not exists guardian_name text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_consent_at timestamptz,
  add column if not exists photo_updated_at timestamptz;

-- Dropdown lists, edited by a super admin in Admin, Settings.
insert into public.site_settings (key, value, is_public) values ('profile_options', '{
  "genders": ["Male", "Female", "Other", "Prefer not to say"],
  "courses": [
    {"name": "Diploma (Polytechnic)", "years": ["1st year", "2nd year", "3rd year"], "branches": true},
    {"name": "Engineering (B.E. / B.Tech)", "years": ["1st year", "2nd year", "3rd year", "4th year"], "branches": true},
    {"name": "Postgraduate (M.E. / M.Tech)", "years": ["1st year", "2nd year"], "branches": true},
    {"name": "PhD", "years": ["1st year", "2nd year", "3rd year", "4th year", "5th year"], "branches": true},
    {"name": "ITI", "years": ["1st year", "2nd year"], "branches": false},
    {"name": "Science or computer degree (B.Sc, BCA, M.Sc, MCA)", "years": ["1st year", "2nd year", "3rd year"], "branches": false},
    {"name": "School (Class 8 to 12)", "years": ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12"], "branches": false},
    {"name": "Other", "years": ["1st year", "2nd year", "3rd year", "4th year"], "branches": false}
  ],
  "branches": ["Mechanical", "Mechatronics", "Robotics and Automation", "Electrical", "Electronics", "Electronics and Telecommunication",
               "Instrumentation", "Computer", "Information Technology", "Artificial Intelligence and Data Science", "Civil",
               "Production", "Automobile", "Chemical", "Other"]
}'::jsonb, true)
on conflict (key) do nothing;

create or replace function private.opts() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.site_settings where key = 'profile_options'), '{}'::jsonb)
$$;

-- Checks gender and student details against the lists. Returns null when fine, or {ok:false, field, error}.
create or replace function private.check_details(p_audience text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o jsonb := private.opts(); c jsonb;
  v_gender text := nullif(trim(coalesce(p->>'gender', '')), '');
  v_course text := nullif(trim(coalesce(p->>'course', '')), '');
  v_year text := nullif(trim(coalesce(p->>'study_year', '')), '');
  v_branch text := nullif(trim(coalesce(p->>'branch', '')), '');
begin
  if p_audience not in ('student', 'professional') then return null; end if;
  if v_gender is null or not coalesce((o->'genders') ? v_gender, false) then
    return jsonb_build_object('ok', false, 'field', 'gender', 'error', 'Choose your gender from the list.');
  end if;
  if p_audience = 'student' then
    select x into c from jsonb_array_elements(coalesce(o->'courses', '[]'::jsonb)) x where x->>'name' = v_course limit 1;
    if c is null then return jsonb_build_object('ok', false, 'field', 'course', 'error', 'Choose your course.'); end if;
    if v_year is null or not coalesce((c->'years') ? v_year, false) then
      return jsonb_build_object('ok', false, 'field', 'study_year', 'error', 'Choose your year of study.');
    end if;
    if coalesce((c->>'branches')::boolean, false) and (v_branch is null or not coalesce((o->'branches') ? v_branch, false)) then
      return jsonb_build_object('ok', false, 'field', 'branch', 'error', 'Choose your branch.');
    end if;
  end if;
  return null;
end $$;

-- The values to store for a member type: student fields only for students, branch only where the course has branches.
create or replace function private.clean_details(p_audience text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o jsonb := private.opts(); c jsonb; v_course text := nullif(trim(coalesce(p->>'course', '')), '');
begin
  if p_audience = 'student' then
    select x into c from jsonb_array_elements(coalesce(o->'courses', '[]'::jsonb)) x where x->>'name' = v_course limit 1;
  end if;
  return jsonb_build_object(
    'gender', case when p_audience in ('student', 'professional') then nullif(trim(coalesce(p->>'gender', '')), '') end,
    'course', case when p_audience = 'student' then v_course end,
    'study_year', case when p_audience = 'student' then nullif(trim(coalesce(p->>'study_year', '')), '') end,
    'branch', case when p_audience = 'student' and coalesce((c->>'branches')::boolean, false) then nullif(trim(coalesce(p->>'branch', '')), '') end);
end $$;

create or replace function private.is_minor(p_dob date) returns boolean language sql stable set search_path = '' as $$
  select p_dob is not null and p_dob > (private.today() - interval '18 years')::date
$$;

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
  select * into pl from public.membership_plans where code = p_data->>'plan_code' and is_published;
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
    v_chk := private.check_details(pl.audience::text, p_data);
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
    gender = v->>'gender', course = v->>'course', branch = v->>'branch', study_year = v->>'study_year',
    guardian_name = case when v_minor then left(trim(p_data->>'guardian_name'), 80) end,
    guardian_phone = case when v_minor then p_data->>'guardian_phone' end,
    guardian_consent_at = case when v_minor then now() end,
    referral_code = coalesce(referral_code, upper(substr(md5(gen_random_uuid()::text), 1, 8))),
    referred_by = nullif(upper(trim(coalesce(p_data->>'ref', ''))), ''), accepted_terms_at = now()
  where id = p_user;
  insert into private.signup_log (ip_hash) values (p_ip_hash);
  return private.apply_membership(p_user, p_data->>'plan_code', p_data->>'organisation');
end $$;

create or replace function public.member_update_profile(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pr public.profiles; v jsonb; v_chk jsonb;
begin
  select * into pr from public.profiles where id = (select auth.uid());
  if not found then return jsonb_build_object('ok', false, 'error', 'Please sign in again.'); end if;
  if char_length(trim(coalesce(p->>'full_name', ''))) < 2 then return jsonb_build_object('ok', false, 'field', 'full_name', 'error', 'Enter your full name.'); end if;
  if coalesce(p->>'phone', '') !~ '^[6-9][0-9]{9}$' then return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a 10-digit Indian mobile number.'); end if;
  if pr.kind in ('student', 'professional') then
    v_chk := private.check_details(pr.kind, p);
    if v_chk is not null then return v_chk; end if;
  end if;
  if private.is_minor(pr.dob) and pr.kind in ('student', 'professional') then
    if char_length(trim(coalesce(p->>'guardian_name', ''))) < 2 then
      return jsonb_build_object('ok', false, 'field', 'guardian_name', 'error', 'Enter the name of your parent or guardian.');
    end if;
    if coalesce(p->>'guardian_phone', '') !~ '^[6-9][0-9]{9}$' then
      return jsonb_build_object('ok', false, 'field', 'guardian_phone', 'error', 'Enter your parent''s or guardian''s 10-digit mobile number.');
    end if;
  end if;
  v := private.clean_details(pr.kind, p);
  update public.profiles set full_name = left(trim(p->>'full_name'), 80), phone = p->>'phone',
    city = left(nullif(trim(coalesce(p->>'city', '')), ''), 80), state = left(nullif(trim(coalesce(p->>'state', '')), ''), 60),
    organisation = left(nullif(trim(coalesce(p->>'organisation', '')), ''), 120), designation = left(nullif(trim(coalesce(p->>'designation', '')), ''), 120),
    website = left(nullif(trim(coalesce(p->>'website', '')), ''), 160),
    gender = case when pr.kind in ('student', 'professional') then v->>'gender' else gender end,
    course = case when pr.kind in ('student', 'professional') then v->>'course' else course end,
    branch = case when pr.kind in ('student', 'professional') then v->>'branch' else branch end,
    study_year = case when pr.kind in ('student', 'professional') then v->>'study_year' else study_year end,
    guardian_name = case when private.is_minor(pr.dob) then left(trim(p->>'guardian_name'), 80) else guardian_name end,
    guardian_phone = case when private.is_minor(pr.dob) then p->>'guardian_phone' else guardian_phone end
  where id = pr.id;
  -- The membership record keeps the same organisation name as the profile.
  update public.memberships set organisation = left(nullif(trim(coalesce(p->>'organisation', '')), ''), 120)
  where user_id = pr.id and status in ('pending_approval', 'pending_payment', 'active', 'suspended', 'expired')
    and nullif(trim(coalesce(p->>'organisation', '')), '') is not null;
  return jsonb_build_object('ok', true);
end $$;

-- Before payment a member changes type themselves, giving the details the new type needs.
-- (A new function; the older member_switch_plan(text) is left in place and no longer used by the website.)
create or replace function public.member_switch_type(p_plan_code text, p_details jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.memberships; pl public.membership_plans; merged jsonb; v jsonb; v_chk jsonb;
begin
  select * into m from public.memberships where user_id = (select auth.uid()) and status in ('pending_approval', 'pending_payment') for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'The type can be changed here only before payment. After payment, send a change request.'); end if;
  select * into pl from public.membership_plans where code = p_plan_code and is_published;
  if not found then return jsonb_build_object('ok', false, 'error', 'That plan is not available.'); end if;
  if p_details is not null then
    merged := (select to_jsonb(pr) from public.profiles pr where pr.id = m.user_id) || p_details;
    v_chk := private.check_details(pl.audience::text, merged);
    if v_chk is not null then return v_chk; end if;
    if char_length(trim(coalesce(merged->>'organisation', ''))) < 2 then
      return jsonb_build_object('ok', false, 'field', 'organisation', 'error', 'Enter your school, college, institution or company.');
    end if;
    v := private.clean_details(pl.audience::text, merged);
    update public.profiles set organisation = left(trim(merged->>'organisation'), 120),
      designation = left(nullif(trim(coalesce(merged->>'designation', '')), ''), 120),
      gender = coalesce(v->>'gender', gender), course = v->>'course', branch = v->>'branch', study_year = v->>'study_year'
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
revoke execute on function public.member_switch_type(text, jsonb) from public, anon;
grant execute on function public.member_switch_type(text, jsonb) to authenticated;

-- Signed-in re-application can carry the details for the chosen type.
-- (A new function; the older member_apply(text, text) is left in place and no longer used by the website.)
create or replace function public.member_reapply(p_plan_code text, p_org text default null, p_details jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; merged jsonb; v jsonb; v_chk jsonb;
begin
  if (select auth.uid()) is null then return jsonb_build_object('ok', false, 'error', 'Please sign in.'); end if;
  select * into pl from public.membership_plans where code = p_plan_code and is_published;
  if found and p_details is not null then
    merged := (select to_jsonb(pr) from public.profiles pr where pr.id = (select auth.uid())) || p_details;
    v_chk := private.check_details(pl.audience::text, merged);
    if v_chk is not null then return v_chk; end if;
    v := private.clean_details(pl.audience::text, merged);
    update public.profiles set gender = coalesce(v->>'gender', gender), course = v->>'course', branch = v->>'branch', study_year = v->>'study_year',
      designation = coalesce(nullif(trim(coalesce(p_details->>'designation', '')), ''), designation)
    where id = (select auth.uid());
  end if;
  update public.profiles set organisation = coalesce(nullif(trim(coalesce(p_org, '')), ''), organisation),
    referral_code = coalesce(referral_code, upper(substr(md5(gen_random_uuid()::text), 1, 8))), accepted_terms_at = coalesce(accepted_terms_at, now())
  where id = (select auth.uid());
  return private.apply_membership((select auth.uid()), p_plan_code, p_org);
end $$;
revoke execute on function public.member_reapply(text, text, jsonb) from public, anon;
grant execute on function public.member_reapply(text, text, jsonb) to authenticated;

-- Photo: stored privately at member-photos/<user id>/photo.jpg. This records that one exists, and when it changed.
create or replace function public.member_set_photo(p_on boolean)
returns jsonb language sql security definer set search_path = '' as $$
  update public.profiles set photo_updated_at = case when p_on then now() end where id = (select auth.uid());
  select jsonb_build_object('ok', true);
$$;
revoke execute on function public.member_set_photo(boolean) from public, anon;
grant execute on function public.member_set_photo(boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy member_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff()));
create policy member_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy member_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy member_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The contact form no longer speaks of an age limit.
do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'submit_lead';
  d := replace(d, 'Pre-registration is for people aged 18 or above. If you are younger, ask a parent or your college coordinator to register.',
                  'Please confirm that the details above are true.');
  execute d;
end $$;
