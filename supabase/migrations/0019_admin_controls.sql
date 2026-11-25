-- 25 Nov 2026, stage 4: GRAAS staff can create, edit, pause and remove everything.
--  * Add a member from Admin (a login with a first password, emailed by the portal), and edit a member's details.
--  * Add a college or school chapter on behalf of an institution, with a coordinator login that belongs to the chapter.
--  * Change a chapter's coordinator (the login moves to the new person; the old one loses access), edit or remove a chapter.

create or replace function public.svc_admin_member_create(p_user uuid, p jsonb, p_actor uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pl public.membership_plans; r jsonb; v_m uuid;
begin
  select * into pl from public.membership_plans where code = p ->> 'plan_code';
  if not found then return private.err('plan_code', 'Choose a membership type.'); end if;
  update public.profiles set full_name = left(trim(p ->> 'full_name'), 80), phone = nullif(p ->> 'phone', ''),
    city = nullif(left(trim(coalesce(p ->> 'city', '')), 80), ''), state = nullif(left(trim(coalesce(p ->> 'state', '')), 60), ''),
    organisation = nullif(left(trim(coalesce(p ->> 'organisation', '')), 120), ''), designation = nullif(left(trim(coalesce(p ->> 'designation', '')), 120), ''),
    kind = pl.audience::text, must_change_password = true
  where id = p_user;
  r := private.apply_membership(p_user, pl.code, nullif(trim(coalesce(p ->> 'organisation', '')), ''));
  if not coalesce((r ->> 'ok')::boolean, false) then return r; end if;
  v_m := (r ->> 'membership_id')::uuid;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (p_actor, 'member_added_by_staff', 'memberships', v_m::text, jsonb_build_object('plan', pl.code, 'user', p_user));
  return jsonb_build_object('ok', true, 'membership_id', v_m, 'status', (select status from public.memberships where id = v_m), 'plan', pl.name,
    'free', coalesce(pl.price_inr, 0) = 0);
end $$;

/** Staff correct a member's details. Empty values leave a field as it is, except where the field is listed in p.clear. */
create or replace function public.staff_member_update(p_user uuid, p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pr public.profiles; f text; v text;
begin
  if not private.is_staff(array['membership_desk']::public.staff_role[]) then return private.err(null, 'Your role cannot edit members.'); end if;
  select * into pr from public.profiles where id = p_user for update;
  if not found then return private.err(null, 'Member not found.'); end if;
  if (select s.user_id from public.staff_members s where s.user_id = p_user) is not null and not private.is_staff(array['super_admin']::public.staff_role[]) then
    return private.err(null, 'Only a super admin can edit a staff login.');
  end if;
  if p ? 'phone' and coalesce(p ->> 'phone', '') <> '' and (p ->> 'phone') !~ '^[6-9][0-9]{9}$' then return private.err('phone', 'Enter a 10-digit mobile number.'); end if;
  if p ? 'dob' and coalesce(p ->> 'dob', '') <> '' then
    begin perform (p ->> 'dob')::date; exception when others then return private.err('dob', 'Check the date of birth.'); end;
  end if;
  update public.profiles set
    full_name = coalesce(nullif(left(trim(p ->> 'full_name'), 80), ''), full_name),
    phone = case when p ? 'phone' then nullif(p ->> 'phone', '') else phone end,
    phone_verified_at = case when p ? 'phone' and nullif(p ->> 'phone', '') is distinct from phone then null else phone_verified_at end,
    city = case when p ? 'city' then nullif(left(trim(p ->> 'city'), 80), '') else city end,
    state = case when p ? 'state' then nullif(left(trim(p ->> 'state'), 60), '') else state end,
    organisation = case when p ? 'organisation' then nullif(left(trim(p ->> 'organisation'), 120), '') else organisation end,
    designation = case when p ? 'designation' then nullif(left(trim(p ->> 'designation'), 120), '') else designation end,
    gender = case when p ? 'gender' then nullif(p ->> 'gender', '') else gender end,
    dob = case when p ? 'dob' then nullif(p ->> 'dob', '')::date else dob end,
    course = case when p ? 'course' then nullif(p ->> 'course', '') else course end,
    course_other = case when p ? 'course_other' then nullif(left(trim(p ->> 'course_other'), 80), '') else course_other end,
    branch = case when p ? 'branch' then nullif(p ->> 'branch', '') else branch end,
    branch_other = case when p ? 'branch_other' then nullif(left(trim(p ->> 'branch_other'), 80), '') else branch_other end,
    study_year = case when p ? 'study_year' then nullif(p ->> 'study_year', '') else study_year end,
    guardian_name = case when p ? 'guardian_name' then nullif(left(trim(p ->> 'guardian_name'), 80), '') else guardian_name end,
    guardian_phone = case when p ? 'guardian_phone' then nullif(p ->> 'guardian_phone', '') else guardian_phone end
  where id = p_user;
  if p ? 'organisation' then
    update public.memberships m set organisation = nullif(left(trim(p ->> 'organisation'), 120), '')
     from public.membership_plans pl where pl.id = m.plan_id and m.user_id = p_user and pl.audience in ('institution', 'industry');
  end if;
  for f in select key from jsonb_object_keys(p) key loop v := coalesce(v || ', ', '') || f; end loop;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values ((select auth.uid()), 'member_edited_by_staff', 'profiles', p_user::text, jsonb_build_object('fields', v));
  return jsonb_build_object('ok', true);
end $$;

/** Server: a chapter created by GRAAS staff on behalf of a college or school. It starts as a draft the coordinator completes. */
create or replace function public.svc_chapter_create(p_head uuid, p jsonb, p_actor uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_kind text := p ->> 'kind'; s jsonb := private.chapter_settings(); v_id uuid;
begin
  if v_kind not in ('college', 'school') then return private.err('kind', 'Choose college or school.'); end if;
  if char_length(trim(coalesce(p ->> 'institution', ''))) < 3 then return private.err('institution', 'Enter the name of the college or school.'); end if;
  if v_kind = 'college' and coalesce(trim(p ->> 'branch'), '') = '' then return private.err('branch', 'Choose the branch.'); end if;
  if exists (select 1 from public.chapters where head_user = p_head and removed_at is null and status in ('draft', 'submitted', 'approved')) then
    return private.err('head_email', 'This person already coordinates a chapter. Use another email, or change the coordinator of that chapter first.');
  end if;
  insert into public.chapters (kind, institution, branch, branch_other, city, state, principal_name, head_user, head_name, head_email, head_phone,
    head_designation, head_department, status, free_seats, min_members)
  values (v_kind, left(trim(p ->> 'institution'), 160), case when v_kind = 'college' then nullif(p ->> 'branch', '') end,
    case when v_kind = 'college' then nullif(left(trim(coalesce(p ->> 'branch_other', '')), 80), '') end,
    nullif(left(trim(coalesce(p ->> 'city', '')), 80), ''), nullif(left(trim(coalesce(p ->> 'state', '')), 60), ''),
    nullif(left(trim(coalesce(p ->> 'principal_name', '')), 120), ''), p_head, left(trim(p ->> 'head_name'), 80), lower(trim(p ->> 'head_email')),
    nullif(p ->> 'head_phone', ''), nullif(left(trim(coalesce(p ->> 'head_designation', '')), 120), ''), nullif(left(trim(coalesce(p ->> 'head_department', '')), 120), ''),
    'draft', case when v_kind = 'school' then null else coalesce((s ->> 'free_seats')::int, 15) end, coalesce((s ->> 'min_members')::int, 10))
  returning id into v_id;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values (p_actor, 'chapter_created_by_staff', 'chapters', v_id::text, jsonb_build_object('kind', v_kind));
  return jsonb_build_object('ok', true, 'id', v_id, 'label', (select private.chapter_label(c) from public.chapters c where c.id = v_id));
end $$;

/** Server: the chapter login moves to a new coordinator. The previous login keeps any membership of its own but loses the chapter. */
create or replace function public.svc_chapter_transfer(p_chapter uuid, p_head uuid, p jsonb, p_actor uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters;
begin
  select * into c from public.chapters where id = p_chapter for update;
  if not found then return private.err(null, 'Chapter not found.'); end if;
  if c.head_user = p_head then return private.err('head_email', 'This person is already the coordinator.'); end if;
  if exists (select 1 from public.chapters where head_user = p_head and id <> c.id and removed_at is null and status in ('draft', 'submitted', 'approved')) then
    return private.err('head_email', 'This person already coordinates another chapter.');
  end if;
  update public.chapters set head_user = p_head, head_name = left(trim(p ->> 'head_name'), 80), head_email = lower(trim(p ->> 'head_email')),
    head_phone = nullif(p ->> 'head_phone', ''), head_designation = nullif(left(trim(coalesce(p ->> 'head_designation', '')), 120), ''),
    head_department = coalesce(nullif(left(trim(coalesce(p ->> 'head_department', '')), 120), ''), head_department)
  where id = c.id;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (p_actor, 'chapter_coordinator_changed', 'chapters', c.id::text, jsonb_build_object('from', c.head_user, 'to', p_head, 'reason', p ->> 'reason'));
  return jsonb_build_object('ok', true, 'label', private.chapter_label(c));
end $$;

create or replace function public.staff_chapter_update(p_id uuid, p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters;
begin
  if not private.is_staff(array['chapter_manager', 'membership_desk']::public.staff_role[]) then return private.err(null, 'Your role cannot edit chapters.'); end if;
  select * into c from public.chapters where id = p_id for update;
  if not found then return private.err(null, 'Chapter not found.'); end if;
  if p ? 'institution' and char_length(trim(coalesce(p ->> 'institution', ''))) < 3 then return private.err('institution', 'Enter the name of the college or school.'); end if;
  update public.chapters set
    institution = case when p ? 'institution' then left(trim(p ->> 'institution'), 160) else institution end,
    branch = case when p ? 'branch' and kind = 'college' then nullif(p ->> 'branch', '') else branch end,
    branch_other = case when p ? 'branch_other' and kind = 'college' then nullif(left(trim(p ->> 'branch_other'), 80), '') else branch_other end,
    city = case when p ? 'city' then nullif(left(trim(p ->> 'city'), 80), '') else city end,
    state = case when p ? 'state' then nullif(left(trim(p ->> 'state'), 60), '') else state end,
    principal_name = case when p ? 'principal_name' then nullif(left(trim(p ->> 'principal_name'), 120), '') else principal_name end,
    address = case when p ? 'address' then nullif(left(trim(p ->> 'address'), 300), '') else address end,
    pincode = case when p ? 'pincode' then nullif(left(trim(p ->> 'pincode'), 10), '') else pincode end,
    website = case when p ? 'website' then private.clean_url(p ->> 'website') else website end
  where id = c.id;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values ((select auth.uid()), 'chapter_edited_by_staff', 'chapters', c.id::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

/** Remove a chapter from every list and console (its students keep their memberships), or bring it back as suspended. */
create or replace function public.staff_chapter_remove(p_id uuid, p_note text, p_restore boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; n text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not private.is_staff(array['chapter_manager']::public.staff_role[]) then return private.err(null, 'Your role cannot remove chapters.'); end if;
  select * into c from public.chapters where id = p_id for update;
  if not found then return private.err(null, 'Chapter not found.'); end if;
  if not p_restore and n is null then return private.err('note', 'Record why the chapter is removed.'); end if;
  if p_restore then
    update public.chapters set removed_at = null, staff_note = concat_ws(E'\n', staff_note, 'Restored ' || to_char(now() at time zone 'Asia/Kolkata', 'DD Mon YYYY') || coalesce(': ' || n, '')) where id = c.id;
  else
    update public.chapters set removed_at = now(), status = case when status = 'approved' then 'suspended' else status end,
      staff_note = concat_ws(E'\n', staff_note, 'Removed ' || to_char(now() at time zone 'Asia/Kolkata', 'DD Mon YYYY') || ': ' || n) where id = c.id;
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values ((select auth.uid()), case when p_restore then 'chapter_restored' else 'chapter_removed' end, 'chapters', c.id::text, jsonb_build_object('note', n));
  return jsonb_build_object('ok', true);
end $$;

insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_lang, wa_category, wa_params, sort) values
('account_login', 'email', 'member', 'Login created by GRAAS', 'Sent when GRAAS staff create a member, a chapter coordinator login, or move a chapter to a new coordinator. Holds a first password the person changes at sign-in.', true, true,
 'Your GRAAS login is ready',
 E'Hi {{name}},\n\n{{intro}}\n\nSign in at graas.org.in with:\n\n**Login ID:** {{login}}\n**First password:** {{password}}\n\n{{next_step}}\n\n[Sign in to GRAAS]({{link}})\n\nWhen you sign in, you choose your own password. Never share it, not even with GRAAS staff.',
 null, 'en', null, '{}', 99),
('chapter_handover', 'email', 'member', 'Chapter: you are the new coordinator', 'Sent when GRAAS moves a chapter to a coordinator who already has a GRAAS login.', true, false,
 'You now coordinate {{chapter}}',
 E'Hi {{name}},\n\nGRAAS has made you the coordinator of **{{chapter}}**. Sign in with your usual GRAAS login and open the chapter console to manage students, events and the chapter certificate.\n\n[Open the chapter console]({{link}})',
 null, 'en', null, '{}', 100)
on conflict do nothing;

revoke all on function public.svc_admin_member_create(uuid, jsonb, uuid), public.svc_chapter_create(uuid, jsonb, uuid), public.svc_chapter_transfer(uuid, uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.svc_admin_member_create(uuid, jsonb, uuid), public.svc_chapter_create(uuid, jsonb, uuid), public.svc_chapter_transfer(uuid, uuid, jsonb, uuid) to service_role;
grant execute on function public.staff_member_update(uuid, jsonb), public.staff_chapter_update(uuid, jsonb), public.staff_chapter_remove(uuid, text, boolean) to authenticated;
