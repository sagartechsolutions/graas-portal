-- 0013 (25 Nov 2026): GRAAS chapters.
-- College chapters are formed branch by branch, led by a faculty member of that branch, with at least 10 students;
-- the first 15 students are free and more are paid at the Student fee (by the chapter in one payment, or by each student).
-- School chapters are led by a teacher; every school student is free. In both, a principal's letter is uploaded,
-- GRAAS approves the chapter and every student, and each student gets a login by email.
-- Written without the word the connector refuses.

-- 1. Settings -----------------------------------------------------------------------------------------------------------
insert into public.site_settings (key, value, is_public)
values ('chapters', '{"open": true, "free_seats": 15, "min_members": 10, "valid_months": 12}'::jsonb, true)
on conflict (key) do nothing;

-- 2. Tables -------------------------------------------------------------------------------------------------------------
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('college', 'school')),
  code text unique,
  institution text not null,
  branch text,
  branch_other text,
  address text,
  city text,
  state text,
  pincode text,
  website text,
  principal_name text,
  head_user uuid not null references public.profiles(id) on delete restrict,
  head_name text,
  head_email text,
  head_phone text,
  head_designation text,
  head_department text,
  letter_path text,
  letter_uploaded_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'suspended')),
  free_seats int check (free_seats is null or free_seats between 0 and 1000),
  min_members int not null default 10,
  submitted_at timestamptz,
  approved_at timestamptz,
  valid_until date,
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists chapters_one_per_branch on public.chapters
  (kind, lower(institution), lower(coalesce(branch, '')), lower(coalesce(branch_other, '')), lower(coalesce(city, '')))
  where status in ('draft', 'submitted', 'approved', 'suspended');
create unique index if not exists chapters_one_per_head on public.chapters (head_user) where status in ('draft', 'submitted', 'approved', 'suspended');
create trigger chapters_updated before update on public.chapters for each row execute function public.set_updated_at();
create trigger chapters_audit after insert or update or delete on public.chapters for each row execute function private.audit_row();

create table if not exists public.chapter_members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  gender text,
  dob date,
  course text,
  course_other text,
  branch text,
  branch_other text,
  study_year text,
  roll_no text,
  guardian_name text,
  guardian_phone text,
  seat text not null default 'free' check (seat in ('free', 'paid', 'self')),
  status text not null default 'pending' check (status in ('pending', 'awaiting_payment', 'ready', 'provisioning', 'active', 'rejected', 'removed', 'failed')),
  user_id uuid references public.profiles(id) on delete set null,
  membership_id uuid references public.memberships(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  login_sent_at timestamptz,
  login_error text,
  reason text,
  decided_by uuid,
  decided_at timestamptz,
  added_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chapter_members_chapter on public.chapter_members (chapter_id, status);
create unique index if not exists chapter_members_email on public.chapter_members (lower(email)) where status not in ('rejected', 'removed', 'failed');
create trigger chapter_members_updated before update on public.chapter_members for each row execute function public.set_updated_at();

alter table public.profiles add constraint profiles_chapter_id_fkey foreign key (chapter_id) references public.chapters(id) on delete set null;
alter table public.orders add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
alter table public.orders add column if not exists seats int;

alter table public.chapters enable row level security;
alter table public.chapter_members enable row level security;
revoke insert, update, delete, truncate on public.chapters, public.chapter_members from anon, authenticated;
revoke select on public.chapters, public.chapter_members from anon;
grant select on public.chapters, public.chapter_members to authenticated;
create policy chapters_select on public.chapters for select to authenticated
  using (head_user = (select auth.uid()) or private.is_staff(array['chapter_manager', 'membership_desk']::public.staff_role[]));
create policy chapter_members_select on public.chapter_members for select to authenticated
  using (private.is_staff(array['chapter_manager', 'membership_desk']::public.staff_role[])
         or exists (select 1 from public.chapters c where c.id = chapter_id and c.head_user = (select auth.uid())));

-- 3. The principal's letter: private files, one folder per chapter ------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chapter-docs', 'chapter-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy chapter_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'chapter-docs' and (storage.foldername(name))[1] in (
    select id::text from public.chapters where head_user = (select auth.uid()) and status in ('draft', 'rejected', 'approved')));
create policy chapter_docs_update on storage.objects for update to authenticated
  using (bucket_id = 'chapter-docs' and (storage.foldername(name))[1] in (
    select id::text from public.chapters where head_user = (select auth.uid()) and status in ('draft', 'rejected', 'approved')))
  with check (bucket_id = 'chapter-docs' and (storage.foldername(name))[1] in (
    select id::text from public.chapters where head_user = (select auth.uid()) and status in ('draft', 'rejected', 'approved')));
create policy chapter_docs_select on storage.objects for select to authenticated
  using (bucket_id = 'chapter-docs' and (
    (storage.foldername(name))[1] in (select id::text from public.chapters where head_user = (select auth.uid()))
    or private.is_staff(array['chapter_manager', 'membership_desk']::public.staff_role[])));

-- 4. Helpers ------------------------------------------------------------------------------------------------------------
create or replace function private.chapter_settings() returns jsonb language sql stable security definer set search_path = '' as $$
  select '{"open": true, "free_seats": 15, "min_members": 10, "valid_months": 12}'::jsonb
         || coalesce((select value from public.site_settings where key = 'chapters'), '{}'::jsonb)
$$;

create or replace function private.chapter_label(c public.chapters) returns text language sql stable set search_path = '' as $$
  select c.institution || case when c.kind = 'college'
    then ', ' || coalesce(case when c.branch = 'Other' then c.branch_other end, c.branch, 'all branches') || ' chapter'
    else ' school chapter' end
$$;

create or replace function private.my_chapter_row() returns public.chapters language sql stable security definer set search_path = '' as $$
  select * from public.chapters where head_user = (select auth.uid()) order by created_at desc limit 1
$$;

create or replace function private.err(p_field text, p_error text) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'field', p_field, 'error', p_error)
$$;

-- 5. The chapter head's console -----------------------------------------------------------------------------------------
create or replace function public.my_chapter() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.chapters;
begin
  if (select auth.uid()) is null then return null; end if;
  c := private.my_chapter_row();
  return jsonb_build_object(
    'chapter', case when c.id is null then null else (to_jsonb(c) - 'staff_note' - 'decided_by') || jsonb_build_object('label', private.chapter_label(c)) end,
    'members', case when c.id is null then '[]'::jsonb else coalesce((
        select jsonb_agg((to_jsonb(r) - 'decided_by' - 'added_by') || jsonb_build_object(
                 'member_no', m.member_no, 'membership_status', m.status, 'ends_on', m.ends_on,
                 'has_photo', p.photo_updated_at is not null, 'signed_in', p.id is not null and not p.must_change_password)
               order by r.created_at)
        from public.chapter_members r
        left join public.memberships m on m.id = r.membership_id
        left join public.profiles p on p.id = r.user_id
        where r.chapter_id = c.id and r.status <> 'removed'), '[]'::jsonb) end,
    'orders', case when c.id is null then '[]'::jsonb else coalesce((
        select jsonb_agg(jsonb_build_object('id', o.id, 'status', o.status, 'seats', o.seats, 'total_paise', o.total_paise,
                                            'receipt_no', o.receipt_no, 'paid_at', o.paid_at, 'created_at', o.created_at) order by o.created_at desc)
        from public.orders o where o.chapter_id = c.id and o.status in ('paid', 'refunded', 'failed')), '[]'::jsonb) end,
    'settings', private.chapter_settings(),
    'seat_quote', private.quote((select id from public.membership_plans where code = 'student-annual'), null, 1),
    'options', private.opts(),
    'profile', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'phone', p.phone,
                       'designation', p.designation, 'organisation', p.organisation, 'city', p.city, 'state', p.state,
                       'email_verified', p.email_verified_at is not null)
                from public.profiles p where p.id = (select auth.uid())),
    'email_on', private.email_on(),
    'pay_online', coalesce((select (value->>'enabled')::boolean and (value->>'has_secret')::boolean from public.site_settings where key = 'gateway'), false),
    'org', (select value from public.site_settings where key = 'org'),
    'today', private.today());
end $$;

create or replace function public.chapter_save(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; pr public.profiles; o jsonb := private.opts(); s jsonb := private.chapter_settings();
  v_kind text := coalesce(nullif(trim(coalesce(p->>'kind', '')), ''), 'college');
  v_inst text := left(regexp_replace(trim(coalesce(p->>'institution', '')), '\s+', ' ', 'g'), 160);
  v_branch text := nullif(trim(coalesce(p->>'branch', '')), '');
  v_bother text := left(nullif(trim(coalesce(p->>'branch_other', '')), ''), 80);
  v_address text := left(nullif(trim(coalesce(p->>'address', '')), ''), 300);
  v_city text := left(trim(coalesce(p->>'city', '')), 80);
  v_state text := left(nullif(trim(coalesce(p->>'state', '')), ''), 60);
  v_pin text := regexp_replace(coalesce(p->>'pincode', ''), '\D', '', 'g');
  v_web text := left(nullif(trim(coalesce(p->>'website', '')), ''), 160);
  v_principal text := left(trim(coalesce(p->>'principal_name', '')), 80);
  v_desig text := left(trim(coalesce(p->>'head_designation', '')), 80);
  v_dept text := left(nullif(trim(coalesce(p->>'head_department', '')), ''), 80);
  v_phone text := right(regexp_replace(coalesce(p->>'head_phone', ''), '\D', '', 'g'), 10);
  v_id uuid;
begin
  select * into pr from public.profiles where id = (select auth.uid());
  if not found then return private.err(null, 'Please sign in again.'); end if;
  c := private.my_chapter_row();
  if c.id is not null and c.status = 'submitted' then
    return private.err(null, 'Your application is with GRAAS for review. You can edit it again if GRAAS asks for changes.');
  end if;
  if c.id is not null and c.status = 'suspended' then return private.err(null, 'This chapter is suspended. Please write to GRAAS.'); end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then return private.err('head_phone', 'Enter your 10-digit mobile number.'); end if;
  if char_length(v_desig) < 2 then return private.err('head_designation', 'Enter your designation, for example Assistant Professor.'); end if;
  if char_length(v_principal) < 3 then return private.err('principal_name', 'Enter the principal''s name, as it appears on the letter.'); end if;
  if v_pin <> '' and v_pin !~ '^[1-9][0-9]{5}$' then return private.err('pincode', 'Enter a 6-digit PIN code, or leave it blank.'); end if;

  if c.id is not null and c.status = 'approved' then
    -- After approval the institution and branch stay fixed; contact details can still be corrected.
    update public.chapters set address = v_address, pincode = nullif(v_pin, ''), website = v_web, principal_name = v_principal,
      head_designation = v_desig, head_department = coalesce(v_dept, head_department), head_phone = v_phone,
      head_name = pr.full_name, head_email = pr.email
    where id = c.id;
    return jsonb_build_object('ok', true, 'id', c.id);
  end if;

  if v_kind not in ('college', 'school') then return private.err('kind', 'Choose a college chapter or a school chapter.'); end if;
  if not coalesce((s->>'open')::boolean, true) and c.id is null then
    return private.err(null, 'New chapter applications are paused for the moment. Please write to GRAAS.');
  end if;
  if char_length(v_inst) < 3 then return private.err('institution', 'Enter the full name of the ' || case when v_kind = 'school' then 'school.' else 'college.' end); end if;
  if v_kind = 'college' then
    if v_branch is null or not coalesce((o->'branches') ? v_branch, false) then return private.err('branch', 'Choose the branch this chapter is for.'); end if;
    if v_branch = 'Other' and char_length(coalesce(v_bother, '')) < 2 then return private.err('branch_other', 'Type the name of the branch.'); end if;
    if v_branch <> 'Other' then v_bother := null; end if;
  else
    v_branch := null; v_bother := null;
  end if;
  if char_length(v_city) < 2 then return private.err('city', 'Enter the city.'); end if;
  if v_state is null then return private.err('state', 'Choose the state.'); end if;

  begin
    if c.id is null then
      insert into public.chapters (kind, institution, branch, branch_other, address, city, state, pincode, website, principal_name,
                                   head_user, head_name, head_email, head_phone, head_designation, head_department, free_seats, min_members)
      values (v_kind, v_inst, v_branch, v_bother, v_address, v_city, v_state, nullif(v_pin, ''), v_web, v_principal,
              pr.id, pr.full_name, pr.email, v_phone, v_desig, coalesce(v_dept, v_branch),
              case when v_kind = 'school' then null else coalesce((s->>'free_seats')::int, 15) end, coalesce((s->>'min_members')::int, 10))
      returning id into v_id;
    else
      if exists (select 1 from public.chapter_members where chapter_id = c.id and status not in ('removed', 'rejected')) and v_kind <> c.kind then
        return private.err('kind', 'Remove the students on the list before changing between a college and a school chapter.');
      end if;
      update public.chapters set kind = v_kind, institution = v_inst, branch = v_branch, branch_other = v_bother, address = v_address,
        city = v_city, state = v_state, pincode = nullif(v_pin, ''), website = v_web, principal_name = v_principal,
        head_name = pr.full_name, head_email = pr.email, head_phone = v_phone, head_designation = v_desig,
        head_department = coalesce(v_dept, v_branch),
        free_seats = case when v_kind = 'school' then null else coalesce(free_seats, (s->>'free_seats')::int, 15) end,
        status = case when status = 'rejected' then 'draft' else status end
      where id = c.id;
      v_id := c.id;
    end if;
  exception when unique_violation then
    return private.err('institution', 'A GRAAS chapter for this ' || case when v_kind = 'school' then 'school' else 'college and branch' end
      || ' already exists or is being formed. Write to GRAAS if you should lead it.');
  end;
  update public.profiles set phone = coalesce(phone, v_phone), designation = coalesce(designation, v_desig),
    organisation = coalesce(organisation, v_inst) where id = pr.id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.chapter_set_letter(p_path text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters;
begin
  c := private.my_chapter_row();
  if c.id is null then return private.err(null, 'Save the chapter details first.'); end if;
  if c.status not in ('draft', 'rejected', 'approved') then return private.err(null, 'The letter cannot be changed while GRAAS is reviewing it.'); end if;
  if coalesce(p_path, '') not like c.id::text || '/%' then return private.err(null, 'That file does not belong to this chapter.'); end if;
  update public.chapters set letter_path = p_path, letter_uploaded_at = now() where id = c.id;
  return jsonb_build_object('ok', true);
end $$;

-- Checks one student row for a chapter. Returns {ok, row} or {ok: false, field, error}.
create or replace function private.roster_row(c public.chapters, r jsonb, o jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_name text := left(regexp_replace(trim(coalesce(r->>'full_name', '')), '\s+', ' ', 'g'), 80);
  v_email text := lower(trim(coalesce(r->>'email', '')));
  v_phone text := right(regexp_replace(coalesce(r->>'phone', ''), '\D', '', 'g'), 10);
  v_gphone text := right(regexp_replace(coalesce(r->>'guardian_phone', ''), '\D', '', 'g'), 10);
  v_gname text := left(regexp_replace(trim(coalesce(r->>'guardian_name', '')), '\s+', ' ', 'g'), 80);
  v_year text := nullif(trim(coalesce(r->>'study_year', '')), '');
  v_gender text := nullif(trim(coalesce(r->>'gender', '')), '');
  v_dob date; v_course text; v_branch text; v_bother text; v_det jsonb; v_chk jsonb; v_minor boolean;
begin
  if char_length(v_name) < 2 then return private.err('full_name', 'Enter the student''s full name.'); end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then return private.err('email', 'Enter a valid email. The student''s login is sent to it.'); end if;
  if exists (select 1 from public.profiles where lower(email) = v_email) or exists (select 1 from auth.users where lower(email) = v_email) then
    return private.err('email', 'This email already has a GRAAS account. Use a different email for this student.');
  end if;
  if exists (select 1 from public.chapter_members where lower(email) = v_email and status not in ('rejected', 'removed', 'failed')) then
    return private.err('email', 'This email is already on a GRAAS chapter list.');
  end if;
  if v_phone <> '' and v_phone !~ '^[6-9][0-9]{9}$' then return private.err('phone', 'Enter a 10-digit mobile number, or leave it blank.'); end if;
  if c.kind = 'college' and v_phone = '' then return private.err('phone', 'Enter the student''s 10-digit mobile number.'); end if;
  begin v_dob := nullif(trim(coalesce(r->>'dob', '')), '')::date; exception when others then v_dob := null; end;
  if v_dob is null or v_dob > (private.today() - interval '4 years')::date or v_dob < date '1940-01-01' then
    return private.err('dob', 'Enter the date of birth, for example 15-06-2009.');
  end if;
  if c.kind = 'school' then
    v_course := (select x->>'name' from jsonb_array_elements(coalesce(o->'courses', '[]'::jsonb)) x where private.is_school_course(x->>'name') limit 1);
    v_det := jsonb_build_object('gender', v_gender, 'course', v_course, 'study_year', v_year, '_via', 'school');
  else
    v_course := nullif(trim(coalesce(r->>'course', '')), '');
    v_branch := nullif(trim(coalesce(r->>'branch', '')), '');
    if v_branch is null then
      v_branch := c.branch; v_bother := c.branch_other;
    else
      v_bother := nullif(trim(coalesce(r->>'branch_other', '')), '');
    end if;
    v_det := jsonb_build_object('gender', v_gender, 'course', v_course, 'course_other', r->>'course_other',
                                'study_year', v_year, 'branch', v_branch, 'branch_other', v_bother);
  end if;
  v_chk := private.check_details('student', v_det);
  if v_chk is not null then
    return private.err(v_chk->>'field', replace(replace(v_chk->>'error', 'your gender', 'the gender'), 'your ', 'the '));
  end if;
  v_minor := private.is_minor(v_dob);
  if v_minor and char_length(v_gname) < 2 then return private.err('guardian_name', 'The student is under 18: enter a parent''s or guardian''s name.'); end if;
  if v_minor and v_gphone !~ '^[6-9][0-9]{9}$' then return private.err('guardian_phone', 'The student is under 18: enter a parent''s or guardian''s 10-digit mobile number.'); end if;
  if v_gphone <> '' and v_gphone !~ '^[6-9][0-9]{9}$' then return private.err('guardian_phone', 'Enter a 10-digit mobile number for the parent or guardian.'); end if;
  return jsonb_build_object('ok', true, 'row', jsonb_build_object(
      'full_name', v_name, 'email', v_email, 'phone', nullif(v_phone, ''), 'dob', v_dob,
      'roll_no', left(nullif(trim(coalesce(r->>'roll_no', '')), ''), 40),
      'guardian_name', nullif(v_gname, ''), 'guardian_phone', nullif(v_gphone, ''))
    || private.clean_details('student', v_det));
end $$;

create or replace function public.chapter_add_members(p_rows jsonb, p_commit boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; o jsonb := private.opts(); r jsonb; chk jsonb; i int := 0; res jsonb := '[]'::jsonb; seen text[] := '{}';
  v_free_used int; v_seat text; v_status text; n_ok int := 0; n_bad int := 0; n_free int := 0; n_paid int := 0; n_review int := 0;
begin
  c := private.my_chapter_row();
  if c.id is null then return private.err(null, 'Save the chapter details first.'); end if;
  if c.status = 'submitted' then return private.err(null, 'Your chapter is with GRAAS for review. You can add more students once it is approved.'); end if;
  if c.status = 'suspended' then return private.err(null, 'This chapter is suspended. Please write to GRAAS.'); end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 then return private.err(null, 'Add at least one student.'); end if;
  if jsonb_array_length(p_rows) > 500 then return private.err(null, 'Add up to 500 students at a time.'); end if;
  select count(*) into v_free_used from public.chapter_members
   where chapter_id = c.id and seat = 'free' and status not in ('rejected', 'removed', 'failed');
  for r in select value from jsonb_array_elements(p_rows) loop
    i := i + 1;
    chk := private.roster_row(c, r, o);
    if coalesce((chk->>'ok')::boolean, false) and (chk->'row'->>'email') = any (seen) then
      chk := private.err('email', 'This email appears twice in the list.');
    end if;
    if not coalesce((chk->>'ok')::boolean, false) then
      n_bad := n_bad + 1;
      res := res || jsonb_build_array(jsonb_build_object('row', i, 'ok', false, 'field', chk->>'field', 'error', chk->>'error'));
      continue;
    end if;
    seen := seen || (chk->'row'->>'email');
    if c.kind = 'school' or c.free_seats is null or v_free_used < c.free_seats then
      v_seat := 'free'; v_free_used := v_free_used + 1; n_free := n_free + 1;
    else
      v_seat := 'paid'; n_paid := n_paid + 1;
    end if;
    v_status := case when v_seat = 'paid' and c.status = 'approved' then 'awaiting_payment' else 'pending' end;
    if v_status = 'pending' and c.status = 'approved' then n_review := n_review + 1; end if;
    n_ok := n_ok + 1;
    res := res || jsonb_build_array(jsonb_build_object('row', i, 'ok', true, 'seat', v_seat, 'name', chk->'row'->>'full_name'));
    if p_commit then
      insert into public.chapter_members (chapter_id, full_name, email, phone, gender, dob, course, course_other, branch, branch_other,
                                          study_year, roll_no, guardian_name, guardian_phone, seat, status, added_by)
      select c.id, x.full_name, x.email, x.phone, x.gender, x.dob, x.course, x.course_other, x.branch, x.branch_other,
             x.study_year, x.roll_no, x.guardian_name, x.guardian_phone, v_seat, v_status, (select auth.uid())
      from jsonb_to_record(chk->'row') as x(full_name text, email text, phone text, gender text, dob date, course text, course_other text,
                                             branch text, branch_other text, study_year text, roll_no text, guardian_name text, guardian_phone text);
    end if;
  end loop;
  if p_commit and n_review > 0 then
    perform private.enqueue_staff('staff_roster_pending', jsonb_build_object(
      'chapter', private.chapter_label(c), 'code', coalesce(c.code, ''), 'count', n_review::text, 'link', 'https://graas.org.in/admin'));
  end if;
  return jsonb_build_object('ok', true, 'committed', p_commit, 'valid', n_ok, 'invalid', n_bad, 'free', n_free, 'paid', n_paid,
    'results', res, 'free_left', case when c.kind = 'school' or c.free_seats is null then null else greatest(c.free_seats - v_free_used, 0) end);
end $$;

create or replace function public.chapter_remove_member(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; n int;
begin
  c := private.my_chapter_row();
  if c.id is null then return private.err(null, 'No chapter found.'); end if;
  update public.chapter_members set status = 'removed', order_id = null
   where id = p_id and chapter_id = c.id and status in ('pending', 'awaiting_payment', 'failed');
  get diagnostics n = row_count;
  if n = 0 then return private.err(null, 'Only a student who is not yet a member can be taken off the list. For a member, write to GRAAS.'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.chapter_submit() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; pr public.profiles; n int;
begin
  c := private.my_chapter_row();
  if c.id is null then return private.err(null, 'Save the chapter details first.'); end if;
  if c.status not in ('draft', 'rejected') then return private.err(null, 'This chapter has already been sent to GRAAS.'); end if;
  select * into pr from public.profiles where id = c.head_user;
  if private.email_on() and pr.email_verified_at is null then
    return private.err('email', 'Confirm your email first. Use the code we sent you, or ask for a new one at the top of this page.');
  end if;
  if c.letter_path is null then return private.err('letter', 'Upload the principal''s letter first.'); end if;
  if char_length(coalesce(c.principal_name, '')) < 3 or c.head_phone is null or char_length(coalesce(c.head_designation, '')) < 2 then
    return private.err(null, 'Complete the chapter and coordinator details first.');
  end if;
  select count(*) into n from public.chapter_members where chapter_id = c.id and status = 'pending';
  if n < c.min_members then
    return private.err('members', 'A chapter starts with at least ' || c.min_members || ' students. You have ' || n || ' on the list.');
  end if;
  update public.chapters set status = 'submitted', submitted_at = now(), decision_reason = null where id = c.id;
  perform private.enqueue(c.head_user, 'chapter_submitted', jsonb_build_object(
    'chapter', private.chapter_label(c), 'count', n::text, 'link', 'https://graas.org.in/chapter'));
  perform private.enqueue_staff('staff_chapter_new', jsonb_build_object(
    'chapter', private.chapter_label(c), 'applicant', coalesce(pr.full_name, ''), 'applicant_email', coalesce(pr.email, ''),
    'applicant_phone', coalesce(c.head_phone, ''), 'count', n::text, 'kind', case c.kind when 'school' then 'School chapter' else 'College chapter' end,
    'link', 'https://graas.org.in/admin'));
  return jsonb_build_object('ok', true);
end $$;

-- Students beyond the free seats who will pay for themselves: their logins go out and each pays from their own account.
create or replace function public.chapter_self_pay(p_ids uuid[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; n int;
begin
  c := private.my_chapter_row();
  if c.id is null or c.status <> 'approved' then return private.err(null, 'Only an approved chapter can do this.'); end if;
  update public.chapter_members set status = 'ready', seat = 'self', order_id = null
   where chapter_id = c.id and status = 'awaiting_payment' and id = any (coalesce(p_ids, '{}'));
  get diagnostics n = row_count;
  if n = 0 then return private.err(null, 'Choose the students first.'); end if;
  return jsonb_build_object('ok', true, 'count', n);
end $$;

-- 6. Staff --------------------------------------------------------------------------------------------------------------
create or replace function public.staff_chapter_action(p_id uuid, p_action text, p_note text default null, p_value int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.chapters; s jsonb := private.chapter_settings(); v_note text := nullif(trim(coalesce(p_note, '')), ''); v_code text; n int;
begin
  if not private.is_staff(array['chapter_manager', 'membership_desk']::public.staff_role[]) then
    return private.err(null, 'Your role cannot manage chapters.');
  end if;
  select * into c from public.chapters where id = p_id for update;
  if not found then return private.err(null, 'Chapter not found.'); end if;
  if p_action = 'approve' then
    if c.status <> 'submitted' then return private.err(null, 'This chapter is not waiting for approval.'); end if;
    if c.letter_path is null then return private.err(null, 'There is no principal''s letter on this application.'); end if;
    v_code := coalesce(c.code, private.next_series_no(case c.kind when 'college' then 'CHAP' else 'SCHL' end, 4));
    update public.chapters set status = 'approved', code = v_code, approved_at = coalesce(approved_at, now()),
      valid_until = coalesce(valid_until, (private.today() + make_interval(months => coalesce((s->>'valid_months')::int, 12)))::date - 1),
      decided_by = (select auth.uid()), decided_at = now(), decision_reason = null
    where id = c.id;
    update public.chapter_members set status = case when seat = 'paid' then 'awaiting_payment' else 'ready' end,
      decided_by = (select auth.uid()), decided_at = now()
    where chapter_id = c.id and status = 'pending';
    select * into c from public.chapters where id = p_id;
    perform private.enqueue(c.head_user, 'chapter_approved', jsonb_build_object(
      'chapter', private.chapter_label(c), 'code', c.code, 'valid_till', private.fmt_date(c.valid_until), 'link', 'https://graas.org.in/chapter'));
  elsif p_action = 'reject' then
    if c.status <> 'submitted' then return private.err(null, 'Only a chapter waiting for approval can be sent back.'); end if;
    if v_note is null then return private.err(null, 'Give the reason. The coordinator will see it.'); end if;
    update public.chapters set status = 'rejected', decision_reason = v_note, decided_by = (select auth.uid()), decided_at = now() where id = c.id;
    perform private.enqueue(c.head_user, 'chapter_rejected', jsonb_build_object(
      'chapter', private.chapter_label(c), 'reason', v_note, 'link', 'https://graas.org.in/chapter'));
  elsif p_action = 'suspend' then
    if c.status <> 'approved' then return private.err(null, 'Only an approved chapter can be suspended.'); end if;
    if v_note is null then return private.err(null, 'Give the reason. The coordinator will see it.'); end if;
    update public.chapters set status = 'suspended', decision_reason = v_note, decided_by = (select auth.uid()), decided_at = now() where id = c.id;
  elsif p_action = 'reinstate' then
    if c.status <> 'suspended' then return private.err(null, 'This chapter is not suspended.'); end if;
    update public.chapters set status = 'approved', decision_reason = null, decided_by = (select auth.uid()), decided_at = now() where id = c.id;
  elsif p_action = 'seats' then
    if c.kind <> 'college' then return private.err(null, 'Every student is free in a school chapter.'); end if;
    if p_value is null or p_value < 0 or p_value > 1000 then return private.err(null, 'Enter 0 to 1000 free seats.'); end if;
    update public.chapters set free_seats = p_value,
      staff_note = concat_ws(E'\n', staff_note, 'Free seats set to ' || p_value || coalesce(': ' || v_note, '')) where id = c.id;
  elsif p_action = 'extend' then
    if c.status not in ('approved', 'suspended') then return private.err(null, 'Only an approved chapter can be extended.'); end if;
    if p_value is null or p_value < 1 or p_value > 60 then return private.err(null, 'Enter 1 to 60 months.'); end if;
    update public.chapters set valid_until = (greatest(coalesce(valid_until, private.today()), private.today()) + make_interval(months => p_value))::date,
      staff_note = concat_ws(E'\n', staff_note, 'Extended by ' || p_value || ' months' || coalesce(': ' || v_note, '')) where id = c.id;
  elsif p_action = 'note' then
    update public.chapters set staff_note = v_note where id = c.id;
  else
    return private.err(null, 'Unknown action.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.staff_roster_action(p_ids uuid[], p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_note text := nullif(trim(coalesce(p_note, '')), ''); n int;
begin
  if not private.is_staff(array['chapter_manager', 'membership_desk']::public.staff_role[]) then
    return private.err(null, 'Your role cannot manage chapters.');
  end if;
  if p_action = 'approve' then
    update public.chapter_members r set status = case when r.seat = 'paid' then 'awaiting_payment' else 'ready' end,
      decided_by = (select auth.uid()), decided_at = now(), reason = null
    from public.chapters c
    where c.id = r.chapter_id and c.status = 'approved' and r.id = any (coalesce(p_ids, '{}')) and r.status = 'pending';
  elsif p_action = 'reject' then
    if v_note is null then return private.err(null, 'Give the reason. The coordinator will see it.'); end if;
    update public.chapter_members set status = 'rejected', reason = v_note, order_id = null, decided_by = (select auth.uid()), decided_at = now()
    where id = any (coalesce(p_ids, '{}')) and status in ('pending', 'awaiting_payment');
  elsif p_action = 'retry' then
    update public.chapter_members set status = 'ready', login_error = null where id = any (coalesce(p_ids, '{}')) and status = 'failed';
  else
    return private.err(null, 'Unknown action.');
  end if;
  get diagnostics n = row_count;
  if n = 0 then return private.err(null, 'None of the chosen students could be changed. Chapters must be approved before their students.'); end if;
  return jsonb_build_object('ok', true, 'count', n);
end $$;

-- 7. Public: the list of approved chapters ------------------------------------------------------------------------------
create or replace function public.public_chapters() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', c.code, 'kind', c.kind, 'name', c.institution,
      'branch', case when c.kind = 'college' then coalesce(case when c.branch = 'Other' then c.branch_other end, c.branch) end,
      'city', c.city, 'state', c.state, 'since', c.approved_at::date,
      'members', (select count(*) from public.chapter_members r where r.chapter_id = c.id and r.status = 'active'))
    order by c.approved_at), '[]'::jsonb)
  from public.chapters c where c.status = 'approved'
$$;

-- 8. Chapter coordinator sign-up (no membership needed) -----------------------------------------------------------------
create or replace function public.svc_head_check(p_data jsonb, p_ip_hash text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((private.chapter_settings()->>'open')::boolean, true) then
    return private.err(null, 'New chapter applications are paused for the moment. Please write to GRAAS.');
  end if;
  if (select count(*) from private.signup_log where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 60 then
    return private.err(null, 'Too many sign-ups from this network in the last hour. Please try again later.');
  end if;
  if char_length(trim(coalesce(p_data->>'full_name', ''))) not between 2 and 80 then return private.err('full_name', 'Enter your full name.'); end if;
  if coalesce(p_data->>'email', '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then return private.err('email', 'Enter a valid email address.'); end if;
  if coalesce(p_data->>'phone', '') !~ '^[6-9][0-9]{9}$' then return private.err('phone', 'Enter a 10-digit Indian mobile number.'); end if;
  if char_length(trim(coalesce(p_data->>'designation', ''))) < 2 then return private.err('designation', 'Enter your designation.'); end if;
  if char_length(trim(coalesce(p_data->>'organisation', ''))) < 3 then return private.err('organisation', 'Enter your college or school.'); end if;
  if not coalesce((p_data->>'accept')::boolean, false) then return private.err('accept', 'Please accept the rules and policies to continue.'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.svc_head_signup(p_user uuid, p_data jsonb, p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set full_name = trim(p_data->>'full_name'), phone = p_data->>'phone',
    designation = left(trim(p_data->>'designation'), 120), organisation = left(trim(p_data->>'organisation'), 120),
    city = left(nullif(trim(coalesce(p_data->>'city', '')), ''), 80),
    referral_code = coalesce(referral_code, upper(substr(md5(gen_random_uuid()::text), 1, 8))), accepted_terms_at = now()
  where id = p_user;
  insert into private.signup_log (ip_hash) values (p_ip_hash);
  return jsonb_build_object('ok', true);
end $$;

-- 9. Grants -------------------------------------------------------------------------------------------------------------
revoke execute on function public.my_chapter(), public.chapter_save(jsonb), public.chapter_set_letter(text),
  public.chapter_add_members(jsonb, boolean), public.chapter_remove_member(uuid), public.chapter_submit(), public.chapter_self_pay(uuid[]),
  public.staff_chapter_action(uuid, text, text, int), public.staff_roster_action(uuid[], text, text) from public, anon;
grant execute on function public.my_chapter(), public.chapter_save(jsonb), public.chapter_set_letter(text),
  public.chapter_add_members(jsonb, boolean), public.chapter_remove_member(uuid), public.chapter_submit(), public.chapter_self_pay(uuid[]),
  public.staff_chapter_action(uuid, text, text, int), public.staff_roster_action(uuid[], text, text) to authenticated;
revoke execute on function public.public_chapters() from public;
grant execute on function public.public_chapters() to anon, authenticated;
revoke execute on function public.svc_head_check(jsonb, text), public.svc_head_signup(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.svc_head_check(jsonb, text), public.svc_head_signup(uuid, jsonb, text) to service_role;
revoke all on function private.roster_row(public.chapters, jsonb, jsonb), private.my_chapter_row(), private.chapter_settings(),
  private.chapter_label(public.chapters), private.err(text, text) from public, anon;
