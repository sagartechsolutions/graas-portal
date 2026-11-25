-- 25 Nov 2026, stage 2: opportunities, like Naukri inside GRAAS.
-- Paid Industry and Institution members (and GRAAS staff) post jobs, internships, projects, problem statements,
-- challenges and trainings. GRAAS approves every post. College students and professionals see every open post for
-- them; school students see only posts meant for schools. A company sees only the people who applied or whom it
-- invited, plus the top 5 matching profiles for each post. Mobile number and email stay hidden until both sides
-- accept (the member by applying with consent or accepting an invitation, the company by accepting), and are never
-- shown for school students.

create sequence if not exists private.opportunity_no_seq;

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null default ('GRAAS-OPP-' || lpad(nextval('private.opportunity_no_seq')::text, 5, '0')),
  poster uuid references public.profiles(id) on delete set null,
  org_name text not null check (char_length(org_name) between 2 and 120),
  kind text not null check (kind in ('job', 'internship', 'project', 'problem', 'challenge', 'training')),
  title text not null check (char_length(title) between 5 and 120),
  summary text check (summary is null or char_length(summary) <= 200),
  description text not null check (char_length(description) between 30 and 6000),
  skills text[] not null default '{}',
  audience text[] not null default '{college,professional}' check (audience <@ array['school', 'college', 'professional'] and cardinality(audience) > 0),
  branches text[] not null default '{}',
  location text check (location is null or char_length(location) <= 120),
  work_mode text not null default 'onsite' check (work_mode in ('onsite', 'remote', 'hybrid')),
  duration text check (duration is null or char_length(duration) <= 80),
  openings int check (openings is null or openings between 1 and 1000),
  pay text check (pay is null or char_length(pay) <= 120),
  apply_by date,
  starts_on date,
  apply_note text check (apply_note is null or char_length(apply_note) <= 600),
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected', 'paused', 'closed', 'removed')),
  staff_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opportunities_status_idx on public.opportunities (status, created_at desc);
create index if not exists opportunities_poster_idx on public.opportunities (poster);
alter table public.opportunities enable row level security;
create policy opportunities_poster on public.opportunities for select using (poster = (select auth.uid()));
create policy opportunities_staff on public.opportunities for select using (private.is_staff(null));
create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'applied' check (source in ('applied', 'invited')),
  status text not null default 'applied' check (status in ('invited', 'applied', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn', 'declined')),
  note text check (note is null or char_length(note) <= 1500),
  invite_message text check (invite_message is null or char_length(invite_message) <= 800),
  snapshot jsonb not null default '{}'::jsonb,
  member_ok_at timestamptz,
  company_ok_at timestamptz,
  company_note text check (company_note is null or char_length(company_note) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, user_id)
);
create index if not exists applications_user_idx on public.applications (user_id);
alter table public.applications enable row level security;
create policy applications_staff on public.applications for select using (private.is_staff(null));
create trigger applications_updated before update on public.applications for each row execute function public.set_updated_at();

create table if not exists public.opportunity_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
alter table public.opportunity_saves enable row level security;
create policy opportunity_saves_own on public.opportunity_saves for select using (user_id = (select auth.uid()));

-- ---------- helpers ----------

/** Which opportunities a member may see and apply to: school, college or professional; none for companies. */
create or replace function private.member_audience(p_user uuid) returns text language sql stable security definer set search_path = '' as $$
  select case when pl.code = 'school-student' then 'school' when pl.audience = 'student' then 'college' when pl.audience = 'professional' then 'professional' end
  from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
  where m.user_id = p_user and m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today())
  order by m.created_at desc limit 1
$$;

/** An active Industry or Institution member can post. */
create or replace function private.can_post(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
                 where m.user_id = p_user and m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today())
                   and pl.audience in ('industry', 'institution'))
$$;

create or replace function private.opp_open(o public.opportunities) returns boolean language sql stable set search_path = '' as $$
  select o.status = 'approved' and (o.apply_by is null or o.apply_by >= private.today())
$$;

create or replace function private.opp_kind_label(p text) returns text language sql immutable set search_path = '' as $$
  select case p when 'job' then 'Job' when 'internship' then 'Internship' when 'project' then 'Project' when 'problem' then 'Problem statement'
                when 'challenge' then 'Challenge' when 'training' then 'Training' else initcap(p) end
$$;

/** How well a member fits a post: shared skills count most, then branch, the kind of work they are open to, and place. */
create or replace function private.match_score(p_user uuid, o public.opportunities) returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select count(*)::int * 10 from unnest(coalesce(mp.skills, '{}')) s where lower(s) in (select lower(x) from unnest(o.skills) x)), 0)
       + case when cardinality(o.branches) > 0 and coalesce(nullif(pr.branch_other, ''), pr.branch) = any (o.branches) then 8 else 0 end
       + case when coalesce(mp.open_to, '{}') && array[case o.kind when 'job' then 'jobs' when 'internship' then 'internships' when 'project' then 'projects'
                                                          when 'training' then 'sessions' else 'challenges' end] then 5 else 0 end
       + case when o.location is not null and exists (select 1 from unnest(coalesce(mp.locations, '{}')) l where position(lower(l) in lower(o.location)) > 0) then 3 else 0 end
  from public.profiles pr left join public.member_profiles mp on mp.user_id = pr.id
  where pr.id = p_user
$$;

/** What a company sees of a member: the career profile without email, mobile, date of birth or guardian details. */
create or replace function private.member_card(p_user uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', pr.id, 'full_name', pr.full_name, 'city', pr.city, 'state', pr.state, 'organisation', pr.organisation, 'designation', pr.designation,
    'course', pr.course, 'course_other', pr.course_other, 'branch', pr.branch, 'branch_other', pr.branch_other, 'study_year', pr.study_year,
    'photo_updated_at', pr.photo_updated_at,
    'plan', (select jsonb_build_object('name', pl.name, 'code', pl.code, 'audience', pl.audience) from public.memberships m
             join public.membership_plans pl on pl.id = m.plan_id where m.user_id = pr.id order by m.created_at desc limit 1),
    'member_no', (select m.member_no from public.memberships m where m.user_id = pr.id order by m.created_at desc limit 1),
    'mp', coalesce((select to_jsonb(mp) - 'user_id' - 'discoverable' - 'org_about' - 'org_sector' - 'org_size' - 'org_website' - 'updated_at'
                    from public.member_profiles mp where mp.user_id = pr.id), '{}'::jsonb))
  from public.profiles pr where pr.id = p_user
$$;

create or replace function private.opp_json(o public.opportunities) returns jsonb language sql stable security definer set search_path = '' as $$
  select (to_jsonb(o) - 'poster' - 'staff_note' - 'decided_by' - 'created_by')
    || jsonb_build_object('kind_label', private.opp_kind_label(o.kind), 'open', private.opp_open(o),
         'org', (select jsonb_build_object('id', p.id, 'photo_updated_at', p.photo_updated_at, 'city', p.city,
                    'about', mp.org_about, 'sector', mp.org_sector, 'size', mp.org_size, 'website', mp.org_website)
                 from public.profiles p left join public.member_profiles mp on mp.user_id = p.id where p.id = o.poster))
$$;

/** Photos of members a company may see (applicants and its top matches), and the logos of organisations that post. */
create or replace function private.photo_visible(p_owner text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o where o.poster::text = p_owner and o.status in ('approved', 'closed'))
    or ((select auth.uid()) is not null and private.member_audience(p_owner::uuid) in ('college', 'professional') and (
          exists (select 1 from public.applications a join public.opportunities o on o.id = a.opportunity_id
                  where a.user_id::text = p_owner and o.poster = (select auth.uid()))
       or (exists (select 1 from public.opportunities o where o.poster = (select auth.uid()) and o.status = 'approved')
           and exists (select 1 from public.member_profiles mp where mp.user_id::text = p_owner and mp.discoverable))))
$$;
create policy member_photos_shared on storage.objects for select
  using (bucket_id = 'member-photos' and private.photo_visible((storage.foldername(name))[1]));

-- ---------- posting (Industry and Institution members, and staff) ----------

create or replace function public.org_opportunity_save(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := (select auth.uid()); staff boolean := private.is_staff(array['moderator', 'membership_desk']::public.staff_role[]);
  o public.opportunities; v_id uuid := nullif(p ->> 'id', '')::uuid; pr public.profiles;
  v_kind text := p ->> 'kind'; v_aud text[]; v_org text; v_title text := trim(coalesce(p ->> 'title', ''));
  v_desc text := trim(coalesce(p ->> 'description', '')); v_status text; v_apply date; v_start date;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
  if not staff and not private.can_post(u) then
    return private.err(null, 'Posting opportunities is part of the Industry and Institution membership. Your membership needs to be active.');
  end if;
  if v_id is not null then
    select * into o from public.opportunities where id = v_id for update;
    if not found or (not staff and o.poster is distinct from u) then return private.err(null, 'Opportunity not found.'); end if;
    if o.status in ('closed', 'removed') and not staff then return private.err(null, 'This opportunity is closed. Post a new one instead.'); end if;
  end if;
  select * into pr from public.profiles where id = u;
  v_org := case when staff and not private.can_post(u) then coalesce(nullif(trim(p ->> 'org_name'), ''), o.org_name, 'GRAAS')
                when o.id is not null then o.org_name else coalesce(nullif(trim(pr.organisation), ''), pr.full_name) end;
  if v_kind is null or v_kind not in ('job', 'internship', 'project', 'problem', 'challenge', 'training') then return private.err('kind', 'Choose what kind of opportunity this is.'); end if;
  if char_length(v_title) < 5 or char_length(v_title) > 120 then return private.err('title', 'Give a clear title of 5 to 120 characters.'); end if;
  if char_length(v_desc) < 30 then return private.err('description', 'Describe the work, who it suits and what they will learn: at least a few lines.'); end if;
  if char_length(v_desc) > 6000 then return private.err('description', 'Keep the description under 6,000 characters.'); end if;
  select coalesce(array_agg(distinct x), '{}') into v_aud from jsonb_array_elements_text(coalesce(p -> 'audience', '[]'::jsonb)) x where x in ('school', 'college', 'professional');
  if cardinality(v_aud) = 0 then return private.err('audience', 'Choose who can apply.'); end if;
  if 'school' = any (v_aud) and v_kind in ('job', 'internship') then return private.err('audience', 'Jobs and internships cannot be offered to school students. Use a challenge or training instead.'); end if;
  begin
    v_apply := nullif(p ->> 'apply_by', '')::date; v_start := nullif(p ->> 'starts_on', '')::date;
  exception when others then return private.err('apply_by', 'Check the dates.');
  end;
  if v_apply is not null and v_apply < private.today() then return private.err('apply_by', 'The last date to apply is already over.'); end if;
  if coalesce(p ->> 'work_mode', 'onsite') not in ('onsite', 'remote', 'hybrid') then return private.err('work_mode', 'Choose on site, remote or hybrid.'); end if;
  v_status := case when staff then coalesce(o.status, 'approved') when (p ->> 'draft')::boolean then 'draft' else 'pending' end;
  if staff and v_status in ('draft', 'pending', 'rejected') and coalesce((p ->> 'approve')::boolean, true) then v_status := 'approved'; end if;

  if o.id is null then
    insert into public.opportunities (poster, org_name, kind, title, summary, description, skills, audience, branches, location, work_mode, duration,
      openings, pay, apply_by, starts_on, apply_note, status, created_by, decided_by, decided_at)
    values (case when staff and not private.can_post(u) then null else u end,
      left(v_org, 120), v_kind, v_title, nullif(left(trim(coalesce(p ->> 'summary', '')), 200), ''), v_desc,
      private.clean_tags(p -> 'skills', 15, 40), v_aud, private.clean_tags(p -> 'branches', 12, 60),
      nullif(left(trim(coalesce(p ->> 'location', '')), 120), ''), coalesce(p ->> 'work_mode', 'onsite'),
      nullif(left(trim(coalesce(p ->> 'duration', '')), 80), ''), nullif(p ->> 'openings', '')::int,
      nullif(left(trim(coalesce(p ->> 'pay', '')), 120), ''), v_apply, v_start, nullif(left(trim(coalesce(p ->> 'apply_note', '')), 600), ''),
      v_status, u, case when v_status = 'approved' then u end, case when v_status = 'approved' then now() end)
    returning * into o;
  else
    update public.opportunities set org_name = left(v_org, 120), kind = v_kind, title = v_title, summary = nullif(left(trim(coalesce(p ->> 'summary', '')), 200), ''),
      description = v_desc, skills = private.clean_tags(p -> 'skills', 15, 40), audience = v_aud, branches = private.clean_tags(p -> 'branches', 12, 60),
      location = nullif(left(trim(coalesce(p ->> 'location', '')), 120), ''), work_mode = coalesce(p ->> 'work_mode', 'onsite'),
      duration = nullif(left(trim(coalesce(p ->> 'duration', '')), 80), ''), openings = nullif(p ->> 'openings', '')::int,
      pay = nullif(left(trim(coalesce(p ->> 'pay', '')), 120), ''), apply_by = v_apply, starts_on = v_start,
      apply_note = nullif(left(trim(coalesce(p ->> 'apply_note', '')), 600), ''),
      status = case when staff then o.status when o.status = 'draft' and (p ->> 'draft')::boolean then 'draft' else 'pending' end
    where id = o.id returning * into o;
  end if;
  if o.status = 'pending' then
    perform private.enqueue_staff('staff_opportunity_new', jsonb_build_object('title', o.title, 'org', o.org_name,
      'kind', private.opp_kind_label(o.kind), 'link', 'https://graas.org.in/admin'));
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (u, case when v_id is null then 'opportunity_created' else 'opportunity_edited' end, 'opportunities', o.id::text, jsonb_build_object('status', o.status));
  return jsonb_build_object('ok', true, 'id', o.id, 'ref', o.ref, 'status', o.status);
end $$;

create or replace function public.org_opportunity_action(p_id uuid, p_action text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.opportunities; v text;
begin
  select * into o from public.opportunities where id = p_id and poster = (select auth.uid()) for update;
  if not found then return private.err(null, 'Opportunity not found.'); end if;
  v := case
    when p_action = 'pause' and o.status = 'approved' then 'paused'
    when p_action = 'resume' and o.status = 'paused' then 'approved'
    when p_action = 'close' and o.status in ('approved', 'paused', 'pending', 'draft', 'rejected') then 'closed'
    when p_action = 'submit' and o.status in ('draft', 'rejected') then 'pending' end;
  if v is null then return private.err(null, 'This cannot be done now.'); end if;
  update public.opportunities set status = v where id = o.id;
  if v = 'pending' then
    perform private.enqueue_staff('staff_opportunity_new', jsonb_build_object('title', o.title, 'org', o.org_name, 'kind', private.opp_kind_label(o.kind), 'link', 'https://graas.org.in/admin'));
  end if;
  return jsonb_build_object('ok', true, 'status', v);
end $$;

/** The poster's own opportunities, with applicant counts. */
create or replace function public.org_opportunities() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'can_post', private.can_post((select auth.uid())),
    'org', (select jsonb_build_object('name', coalesce(nullif(p.organisation, ''), p.full_name)) from public.profiles p where p.id = (select auth.uid())),
    'items', coalesce((select jsonb_agg(private.opp_json(o) || jsonb_build_object('staff_note', o.staff_note,
        'applicants', (select count(*) from public.applications a where a.opportunity_id = o.id and a.status not in ('invited', 'withdrawn', 'declined')),
        'new', (select count(*) from public.applications a where a.opportunity_id = o.id and a.status = 'applied'),
        'connected', (select count(*) from public.applications a where a.opportunity_id = o.id and a.member_ok_at is not null and a.company_ok_at is not null),
        'invited', (select count(*) from public.applications a where a.opportunity_id = o.id and a.status = 'invited'))
      order by o.created_at desc) from public.opportunities o where o.poster = (select auth.uid()) and o.status <> 'removed'), '[]'::jsonb))
$$;

/** Applicants and invited members for one of the poster's opportunities. Contact only once connected (never for school students). */
create or replace function public.org_applicants(p_opp uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'status', a.status, 'source', a.source, 'note', a.note, 'invite_message', a.invite_message, 'company_note', a.company_note,
      'created_at', a.created_at, 'updated_at', a.updated_at, 'member_ok', a.member_ok_at is not null, 'company_ok', a.company_ok_at is not null,
      'connected', a.member_ok_at is not null and a.company_ok_at is not null,
      'card', coalesce(nullif(a.snapshot, '{}'::jsonb), private.member_card(a.user_id)) || jsonb_build_object('id', a.user_id),
      'contact', case when a.member_ok_at is not null and a.company_ok_at is not null and private.member_audience(a.user_id) <> 'school'
                      then (select jsonb_build_object('email', p.email, 'phone', p.phone) from public.profiles p where p.id = a.user_id) end,
      'score', private.match_score(a.user_id, o))
    order by (a.status = 'applied') desc, a.created_at desc), '[]'::jsonb)
  from public.applications a join public.opportunities o on o.id = a.opportunity_id
  where o.id = p_opp and (o.poster = (select auth.uid()) or private.is_staff(array['moderator', 'membership_desk']::public.staff_role[]))
$$;

/** The top 5 members who fit the post, have not applied yet, and let GRAAS suggest them. No contact details. */
create or replace function public.org_matches(p_opp uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('card', private.member_card(c.user_id), 'score', c.score) order by c.score desc), '[]'::jsonb)
  from (
    select * from (
      select mp.user_id, private.match_score(mp.user_id, o) score
      from public.opportunities o join public.member_profiles mp on mp.discoverable and mp.user_id is distinct from o.poster
      where o.id = p_opp and o.status = 'approved'
        and (o.poster = (select auth.uid()) or private.is_staff(array['moderator', 'membership_desk']::public.staff_role[]))
        and private.member_audience(mp.user_id) = any (array_remove(o.audience, 'school'))
        and not exists (select 1 from public.applications a where a.opportunity_id = o.id and a.user_id = mp.user_id)
    ) s where s.score > 0 order by s.score desc limit 5
  ) c
$$;

create or replace function public.org_application_action(p_id uuid, p_action text, p_note text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.applications; o public.opportunities; v text; ev text;
begin
  select * into a from public.applications where id = p_id for update;
  select * into o from public.opportunities where id = a.opportunity_id;
  if a.id is null or not (o.poster = (select auth.uid()) or (o.poster is null and private.is_staff(array['moderator', 'membership_desk']::public.staff_role[]))) then
    return private.err(null, 'Application not found.');
  end if;
  if a.status in ('withdrawn', 'declined') then return private.err(null, 'The member has withdrawn.'); end if;
  if p_action = 'note' then
    update public.applications set company_note = nullif(left(trim(coalesce(p_note, '')), 600), '') where id = a.id;
    return jsonb_build_object('ok', true);
  end if;
  if p_action = 'accept' then
    if a.status = 'invited' then return private.err(null, 'Waiting for the member to accept your invitation.'); end if;
    update public.applications set company_ok_at = coalesce(company_ok_at, now()),
      status = case when status = 'applied' then 'shortlisted' else status end where id = a.id;
    if a.company_ok_at is null then
      perform private.enqueue(a.user_id, 'opp_connected', jsonb_build_object('org', o.org_name, 'title', o.title,
        'link', 'https://graas.org.in/account?tab=opportunities'), 'oppconn:' || a.id);
    end if;
    return jsonb_build_object('ok', true, 'connected', a.member_ok_at is not null);
  end if;
  v := case p_action when 'shortlist' then 'shortlisted' when 'interview' then 'interview' when 'select' then 'selected' when 'reject' then 'rejected' end;
  if v is null then return private.err(null, 'Unknown action.'); end if;
  if a.status = 'invited' then return private.err(null, 'Waiting for the member to accept your invitation.'); end if;
  update public.applications set status = v where id = a.id;
  ev := case v when 'rejected' then 'not taken forward' when 'selected' then 'selected' when 'interview' then 'called for an interview' else 'shortlisted' end;
  perform private.enqueue(a.user_id, 'opp_status', jsonb_build_object('org', o.org_name, 'title', o.title, 'status', ev,
    'link', 'https://graas.org.in/account?tab=opportunities'), 'oppst:' || a.id || ':' || v);
  return jsonb_build_object('ok', true, 'status', v);
end $$;

create or replace function public.org_invite(p_opp uuid, p_user uuid, p_message text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.opportunities; v_id uuid;
begin
  select * into o from public.opportunities where id = p_opp and status = 'approved'
    and (poster = (select auth.uid()) or (poster is null and private.is_staff(array['moderator', 'membership_desk']::public.staff_role[])));
  if not found then return private.err(null, 'Invitations can be sent only for your approved, open opportunities.'); end if;
  if not exists (select 1 from jsonb_array_elements(public.org_matches(p_opp)) x where (x -> 'card' ->> 'id')::uuid = p_user) then
    return private.err(null, 'This member is no longer among the suggested matches.');
  end if;
  insert into public.applications (opportunity_id, user_id, source, status, invite_message, snapshot, company_ok_at)
  values (o.id, p_user, 'invited', 'invited', nullif(left(trim(coalesce(p_message, '')), 800), ''), private.member_card(p_user), now())
  on conflict (opportunity_id, user_id) do nothing returning id into v_id;
  if v_id is null then return private.err(null, 'This member already has an application or invitation for this post.'); end if;
  perform private.enqueue(p_user, 'opp_invite', jsonb_build_object('org', o.org_name, 'title', o.title, 'kind', private.opp_kind_label(o.kind),
    'link', 'https://graas.org.in/account?tab=opportunities'), 'oppinv:' || v_id);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ---------- members ----------

/** Open opportunities for the signed-in member, best match first, with saved and applied marks. */
create or replace function public.member_opportunities() returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) u, private.member_audience((select auth.uid())) aud)
  select jsonb_build_object(
    'audience', (select aud from me),
    'items', coalesce((select jsonb_agg(private.opp_json(o) || jsonb_build_object(
        'score', private.match_score(me.u, o),
        'saved', exists (select 1 from public.opportunity_saves s where s.user_id = me.u and s.opportunity_id = o.id),
        'applied', (select a.status from public.applications a where a.user_id = me.u and a.opportunity_id = o.id))
      order by private.match_score(me.u, o) desc, o.created_at desc)
      from me, public.opportunities o
      where me.aud is not null and private.opp_open(o) and me.aud = any (o.audience) and o.poster is distinct from me.u), '[]'::jsonb))
$$;

create or replace function public.member_apply_opportunity(p_opp uuid, p_note text, p_consent boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); o public.opportunities; v_aud text := private.member_audience((select auth.uid())); v_id uuid; pr public.profiles;
begin
  select * into o from public.opportunities where id = p_opp;
  if not found or not private.opp_open(o) then return private.err(null, 'This opportunity is not open for applications.'); end if;
  if v_aud is null then return private.err(null, 'Applying is for active GRAAS members.'); end if;
  if not (v_aud = any (o.audience)) then return private.err(null, 'This opportunity is not open to your membership type.'); end if;
  if v_aud <> 'school' and not coalesce(p_consent, false) then
    return private.err('consent', 'Tick the box to let ' || o.org_name || ' see your contact details if they accept you.');
  end if;
  if exists (select 1 from public.applications where opportunity_id = o.id and user_id = u and status not in ('withdrawn')) then
    return private.err(null, 'You have already applied.');
  end if;
  select * into pr from public.profiles where id = u;
  insert into public.applications (opportunity_id, user_id, source, status, note, snapshot, member_ok_at)
  values (o.id, u, 'applied', 'applied', nullif(left(trim(coalesce(p_note, '')), 1500), ''), private.member_card(u), case when v_aud <> 'school' then now() end)
  on conflict (opportunity_id, user_id) do update set status = 'applied', note = excluded.note, snapshot = excluded.snapshot,
    member_ok_at = excluded.member_ok_at, created_at = now()
  returning id into v_id;
  if o.poster is not null then
    perform private.enqueue(o.poster, 'opp_application_new', jsonb_build_object('title', o.title, 'applicant', coalesce(pr.full_name, 'A member'),
      'link', 'https://graas.org.in/account?tab=opportunities'), 'oppapp:' || v_id);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.member_application_action(p_id uuid, p_action text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.applications; o public.opportunities; pr public.profiles;
begin
  select * into a from public.applications where id = p_id and user_id = (select auth.uid()) for update;
  if not found then return private.err(null, 'Application not found.'); end if;
  select * into o from public.opportunities where id = a.opportunity_id;
  if p_action = 'withdraw' and a.status in ('applied', 'shortlisted', 'interview') then
    update public.applications set status = 'withdrawn', member_ok_at = null where id = a.id;
  elsif p_action = 'accept' and a.status = 'invited' then
    if private.member_audience(a.user_id) not in ('college', 'professional') then return private.err(null, 'This invitation is no longer valid.'); end if;
    update public.applications set status = 'shortlisted', member_ok_at = now(), snapshot = private.member_card(a.user_id) where id = a.id;
    select * into pr from public.profiles where id = a.user_id;
    if o.poster is not null then
      perform private.enqueue(o.poster, 'opp_invite_accepted', jsonb_build_object('title', o.title, 'applicant', coalesce(pr.full_name, 'The member'),
        'link', 'https://graas.org.in/account?tab=opportunities'), 'oppacc:' || a.id);
    end if;
  elsif p_action = 'decline' and a.status = 'invited' then
    update public.applications set status = 'declined' where id = a.id;
  else
    return private.err(null, 'This cannot be done now.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.member_save_opportunity(p_opp uuid, p_on boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return private.err(null, 'Please sign in again.'); end if;
  if p_on then
    insert into public.opportunity_saves (user_id, opportunity_id) values ((select auth.uid()), p_opp) on conflict do nothing;
  else
    delete from public.opportunity_saves where user_id = (select auth.uid()) and opportunity_id = p_opp;
  end if;
  return jsonb_build_object('ok', true);
end $$;

/** The member's applications and invitations, with the company's contact once both sides have accepted. */
create or replace function public.my_applications() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'status', a.status, 'source', a.source, 'note', a.note, 'invite_message', a.invite_message,
      'created_at', a.created_at, 'updated_at', a.updated_at, 'connected', a.member_ok_at is not null and a.company_ok_at is not null,
      'opportunity', private.opp_json(o),
      'contact', case when a.member_ok_at is not null and a.company_ok_at is not null
                      then (select jsonb_build_object('name', p.full_name, 'designation', p.designation, 'email', p.email, 'phone', p.phone) from public.profiles p where p.id = o.poster) end)
    order by (a.status = 'invited') desc, a.updated_at desc), '[]'::jsonb)
  from public.applications a join public.opportunities o on o.id = a.opportunity_id
  where a.user_id = (select auth.uid())
$$;

-- ---------- public website ----------

create or replace function public.public_opportunities() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(private.opp_json(o) - 'staff_note' order by o.created_at desc), '[]'::jsonb)
  from public.opportunities o where private.opp_open(o)
$$;

create or replace function public.public_opportunity(p_ref text) returns jsonb language sql stable security definer set search_path = '' as $$
  select private.opp_json(o) from public.opportunities o where o.ref = upper(trim(p_ref)) and o.status in ('approved', 'closed', 'paused')
$$;

-- ---------- staff ----------

create or replace function public.staff_opportunities() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not private.is_staff(array['moderator', 'membership_desk']::public.staff_role[]) then '[]'::jsonb else
    coalesce((select jsonb_agg(private.opp_json(o) || jsonb_build_object('staff_note', o.staff_note, 'poster_id', o.poster, 'decided_at', o.decided_at,
        'poster', (select jsonb_build_object('name', p.full_name, 'email', p.email, 'phone', p.phone, 'member_no',
                    (select m.member_no from public.memberships m where m.user_id = p.id order by m.created_at desc limit 1)) from public.profiles p where p.id = o.poster),
        'applicants', (select count(*) from public.applications a where a.opportunity_id = o.id and a.status not in ('invited', 'withdrawn', 'declined')))
      order by (o.status = 'pending') desc, o.created_at desc) from public.opportunities o), '[]'::jsonb) end
$$;

create or replace function public.staff_opportunity_action(p_id uuid, p_action text, p_note text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.opportunities; v text; n text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not private.is_staff(array['moderator', 'membership_desk']::public.staff_role[]) then return private.err(null, 'Your role cannot do this.'); end if;
  select * into o from public.opportunities where id = p_id for update;
  if not found then return private.err(null, 'Opportunity not found.'); end if;
  v := case
    when p_action = 'approve' and o.status in ('pending', 'rejected', 'paused', 'draft') then 'approved'
    when p_action = 'reject' and o.status in ('pending', 'approved', 'paused') then 'rejected'
    when p_action = 'pause' and o.status = 'approved' then 'paused'
    when p_action = 'resume' and o.status = 'paused' then 'approved'
    when p_action = 'close' and o.status in ('approved', 'paused', 'pending') then 'closed'
    when p_action = 'reopen' and o.status = 'closed' then 'approved'
    when p_action = 'remove' and o.status <> 'removed' then 'removed'
    when p_action = 'restore' and o.status = 'removed' then 'pending' end;
  if v is null then return private.err(null, 'This cannot be done now.'); end if;
  if p_action = 'reject' and n is null then return private.err('note', 'Tell the organisation what to change.'); end if;
  update public.opportunities set status = v, staff_note = coalesce(n, staff_note), decided_by = (select auth.uid()), decided_at = now() where id = o.id;
  if o.poster is not null and p_action = 'approve' then
    perform private.enqueue(o.poster, 'opportunity_approved', jsonb_build_object('title', o.title, 'ref', o.ref,
      'link', 'https://graas.org.in/opportunities/' || lower(o.ref)), 'oppok:' || o.id || ':' || now()::date);
  elsif o.poster is not null and p_action in ('reject', 'remove') then
    perform private.enqueue(o.poster, 'opportunity_rejected', jsonb_build_object('title', o.title, 'reason', coalesce(n, 'It does not meet the GRAAS posting rules.'),
      'link', 'https://graas.org.in/account?tab=opportunities'));
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values ((select auth.uid()), 'opportunity_' || p_action, 'opportunities', o.id::text, jsonb_build_object('note', n));
  return jsonb_build_object('ok', true, 'status', v);
end $$;

-- ---------- messages ----------
insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_lang, wa_category, wa_params, sort) values
('staff_opportunity_new', 'email', 'staff', 'Staff: opportunity to check', 'Sent to the staff alert address when an organisation posts or edits an opportunity.', true, false,
 'Opportunity to check: {{title}}',
 E'Hi {{name}},\n\n**{{org}}** has sent a {{kind}} for approval: **{{title}}**.\n\nCheck it in Admin, under Opportunities, and approve it or send it back with a note.\n\n[Open admin]({{link}})',
 null, 'en', null, '{}', 80),
('opportunity_approved', 'email', 'member', 'Opportunity approved', 'Sent to the organisation when GRAAS approves its opportunity.', true, false,
 'Your opportunity is live: {{title}}',
 E'Hi {{name}},\n\nGood news. **{{title}}** ({{ref}}) is approved and members can now see it and apply.\n\nWhen people apply you get an email. Open your account to see their profiles, accept the people you want to talk to, and GRAAS will also suggest the top 5 matching members.\n\n[See the opportunity]({{link}})',
 null, 'en', null, '{}', 81),
('opportunity_rejected', 'email', 'member', 'Opportunity sent back', 'Sent to the organisation when GRAAS sends back or removes an opportunity.', true, false,
 'Please check your opportunity: {{title}}',
 E'Hi {{name}},\n\nThe GRAAS team could not publish **{{title}}** as it is.\n\n**Note from GRAAS:** {{reason}}\n\nYou can edit it and send it again from your account.\n\n[Open my account]({{link}})',
 null, 'en', null, '{}', 82),
('opp_application_new', 'email', 'member', 'Opportunity: new applicant', 'Sent to the organisation when a member applies to its opportunity.', true, false,
 'New applicant for {{title}}',
 E'Hi {{name}},\n\n**{{applicant}}** has applied for **{{title}}**.\n\nOpen your account to see the profile and resume. When you accept an applicant, you both see each other''s contact details.\n\n[See applicants]({{link}})',
 null, 'en', null, '{}', 83),
('opp_connected', 'email', 'member', 'Opportunity: company accepted you', 'Sent to a member when the organisation accepts their application or invitation.', true, false,
 '{{org}} accepted your application',
 E'Hi {{name}},\n\n**{{org}}** has accepted your application for **{{title}}**. You can now see each other''s contact details, and they may call or email you.\n\nKeep an eye on your phone and email, and keep your GRAAS profile up to date.\n\n[Open my applications]({{link}})',
 null, 'en', null, '{}', 84),
('opp_status', 'email', 'member', 'Opportunity: application update', 'Sent to a member when the organisation moves their application forward or closes it.', true, false,
 'Update on your application for {{title}}',
 E'Hi {{name}},\n\nYour application for **{{title}}** at {{org}} has been **{{status}}**.\n\n[Open my applications]({{link}})',
 null, 'en', null, '{}', 85),
('opp_invite', 'email', 'member', 'Opportunity: invitation', 'Sent to a member when an organisation invites them to an opportunity that matches their profile.', true, false,
 '{{org}} invites you: {{title}}',
 E'Hi {{name}},\n\nYour GRAAS profile matches a {{kind}} at **{{org}}**: **{{title}}**. They would like to hear from you.\n\nIf you accept, you both see each other''s contact details. Your details stay hidden if you decline.\n\n[See the invitation]({{link}})',
 null, 'en', null, '{}', 86),
('opp_invite_accepted', 'email', 'member', 'Opportunity: invitation accepted', 'Sent to the organisation when a member accepts its invitation.', true, false,
 '{{applicant}} accepted your invitation',
 E'Hi {{name}},\n\n**{{applicant}}** has accepted your invitation for **{{title}}**. You can now see their contact details in your account.\n\n[See the applicant]({{link}})',
 null, 'en', null, '{}', 87)
on conflict do nothing;

-- ---------- grants ----------
revoke all on function private.member_audience(uuid), private.can_post(uuid), private.opp_open(public.opportunities), private.opp_kind_label(text),
  private.match_score(uuid, public.opportunities), private.member_card(uuid), private.opp_json(public.opportunities), private.photo_visible(text) from public, anon, authenticated;
grant execute on function private.photo_visible(text) to anon, authenticated;
grant execute on function public.org_opportunity_save(jsonb), public.org_opportunity_action(uuid, text), public.org_opportunities(), public.org_applicants(uuid),
  public.org_matches(uuid), public.org_application_action(uuid, text, text), public.org_invite(uuid, uuid, text), public.member_opportunities(),
  public.member_apply_opportunity(uuid, text, boolean), public.member_application_action(uuid, text), public.member_save_opportunity(uuid, boolean),
  public.my_applications(), public.staff_opportunities(), public.staff_opportunity_action(uuid, text, text) to authenticated;
grant execute on function public.public_opportunities(), public.public_opportunity(text) to anon, authenticated;
