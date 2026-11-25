-- 25 Nov 2026, stage 1 of the platform build:
--  * the GRAAS member pledge (taken at sign-up, at a chapter student's first sign-in, or later by existing members),
--    with versioned wording so a certificate always shows the words the member actually pledged;
--  * the career profile (LinkedIn-style): headline, about, skills, experience, education, projects and more,
--    plus a company page for Industry and Institution members;
--  * my_role(), so the website shows each login the right place (Admin, Chapter console, My account).

-- ---------- pledge ----------
create table if not exists public.pledge_texts (
  version int primary key,
  title text not null,
  intro text not null,
  points text[] not null check (cardinality(points) between 1 and 15),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
alter table public.pledge_texts enable row level security;
create policy pledge_texts_read on public.pledge_texts for select using (true);

insert into public.pledge_texts (version, title, intro, points) values (1, 'GRAAS Member Pledge',
  'As a member of the Global Robotics And Automation Society, I pledge to:',
  array[
    'Active participation in Robotics & Automation Awareness Programs, Technical Events, Online/Offline Sessions, Workshops, Conferences etc.',
    'Advance my knowledge and skills in robotics and automation technologies',
    'Promote innovation and excellence in my field of work and study',
    'Collaborate with peers and contribute to the community''s collective growth',
    'Uphold ethical standards and professional conduct in all endeavors',
    'Mentor and support fellow members in their professional development',
    'Apply my knowledge to solve real-world problems and create positive impact'
  ]) on conflict (version) do nothing;

alter table public.profiles add column if not exists pledged_at timestamptz;
alter table public.profiles add column if not exists pledge_version int references public.pledge_texts(version);

create or replace function private.pledge_current() returns int language sql stable security definer set search_path = '' as $$
  select coalesce(max(version), 1) from public.pledge_texts
$$;

create or replace function private.norm_name(p text) returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'))
$$;

/** A member takes the pledge from their account. The typed name is their signature and must match their profile name. */
create or replace function public.member_take_pledge(p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles; v int := private.pledge_current();
begin
  select * into p from public.profiles where id = (select auth.uid());
  if not found then return private.err(null, 'Please sign in again.'); end if;
  if not exists (select 1 from public.memberships where user_id = p.id) then
    return private.err(null, 'The pledge is for GRAAS members. Choose a membership first.');
  end if;
  if private.norm_name(p_name) = '' then return private.err('name', 'Type your full name to sign the pledge.'); end if;
  if private.norm_name(p_name) <> private.norm_name(p.full_name) then
    return private.err('name', 'Type your name exactly as it is in your profile: ' || coalesce(p.full_name, '') || '.');
  end if;
  update public.profiles set pledged_at = now(), pledge_version = v where id = p.id;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (p.id, 'pledge_taken', 'profiles', p.id::text, jsonb_build_object('version', v));
  return jsonb_build_object('ok', true, 'pledged_at', now(), 'version', v);
end $$;

/** Server only: the pledge ticked at sign-up or at a chapter student's first sign-in. */
create or replace function public.svc_mark_pledged(p_user uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.profiles set pledged_at = coalesce(pledged_at, now()), pledge_version = coalesce(pledge_version, private.pledge_current())
   where id = p_user;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.audit_log (actor, action, entity, entity_id, detail)
    values (p_user, 'pledge_taken', 'profiles', p_user::text, jsonb_build_object('version', private.pledge_current(), 'via', 'sign-up'));
  end if;
  return n > 0;
end $$;

/** Staff: new pledge wording. Members who pledged keep the version they signed. */
create or replace function public.staff_set_pledge(p_title text, p_intro text, p_points text[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v int; pts text[];
begin
  if not private.is_staff(array['super_admin']::public.staff_role[]) then return private.err(null, 'Only a super admin can change the pledge.'); end if;
  select coalesce(array_agg(trim(x)), '{}') into pts from unnest(coalesce(p_points, '{}')) x where trim(x) <> '';
  if cardinality(pts) = 0 or cardinality(pts) > 15 then return private.err('points', 'Give between 1 and 15 pledge lines.'); end if;
  if exists (select 1 from unnest(pts) x where char_length(x) > 220) then return private.err('points', 'Keep each line under 220 characters.'); end if;
  if coalesce(trim(p_intro), '') = '' then return private.err('intro', 'Add the opening line.'); end if;
  select coalesce(max(version), 0) + 1 into v from public.pledge_texts;
  insert into public.pledge_texts (version, title, intro, points, created_by)
  values (v, coalesce(nullif(trim(p_title), ''), 'GRAAS Member Pledge'), left(trim(p_intro), 300), pts, (select auth.uid()));
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values ((select auth.uid()), 'pledge_changed', 'pledge_texts', v::text, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'version', v);
end $$;

-- ---------- career profile and company page ----------
create table if not exists public.member_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  about text,
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  links jsonb not null default '{}'::jsonb,
  open_to text[] not null default '{}',
  locations text[] not null default '{}',
  discoverable boolean not null default true,
  org_about text,
  org_sector text,
  org_size text,
  org_website text,
  updated_at timestamptz not null default now()
);
alter table public.member_profiles enable row level security;
create policy member_profiles_own on public.member_profiles for select using (user_id = (select auth.uid()));
create policy member_profiles_staff on public.member_profiles for select using (private.is_staff(null));

/** Keeps only the named text fields of each item, trimmed and cut to length, and leaves out empty items. */
create or replace function private.clean_items(p jsonb, p_keys text[], p_max int, p_len int) returns jsonb language plpgsql immutable set search_path = '' as $$
declare it jsonb; o jsonb; k text; v text; res jsonb := '[]'::jsonb; n int := 0;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return '[]'::jsonb; end if;
  for it in select value from jsonb_array_elements(p) loop
    exit when n >= p_max;
    continue when jsonb_typeof(it) <> 'object';
    o := '{}'::jsonb;
    foreach k in array p_keys loop
      if jsonb_typeof(it -> k) = 'boolean' then
        o := o || jsonb_build_object(k, (it ->> k)::boolean);
      else
        v := left(trim(coalesce(it ->> k, '')), case when k in ('summary', 'detail') then p_len * 4 else p_len end);
        if v <> '' then o := o || jsonb_build_object(k, v); end if;
      end if;
    end loop;
    continue when (select count(*) from jsonb_object_keys(o) x where x <> 'current') = 0;
    res := res || jsonb_build_array(o);
    n := n + 1;
  end loop;
  return res;
end $$;

create or replace function private.clean_tags(p jsonb, p_max int, p_len int) returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(t order by o), '{}') from (
    select t, o from (
      select distinct on (lower(t)) t, o from (
        select left(regexp_replace(trim(value), '\s+', ' ', 'g'), p_len) t, ordinality o
        from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) with ordinality
      ) a where t <> '' order by lower(t), o
    ) b order by o limit p_max
  ) c
$$;

create or replace function private.clean_url(p text) returns text language sql immutable set search_path = '' as $$
  select case when trim(coalesce(p, '')) = '' then null
              when trim(p) ~* '^https?://[^\s/$.?#][^\s]*$' then left(trim(p), 200)
              when trim(p) ~* '^[a-z0-9.-]+\.[a-z]{2,}(/[^\s]*)?$' then left('https://' || trim(p), 200)
              else null end
$$;

/** The member's own career profile (or company page). Anything not given is left as it is. */
create or replace function public.member_profile_save(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); r public.member_profiles; l jsonb; bad text;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
  if not exists (select 1 from public.memberships where user_id = u) then
    return private.err(null, 'The career profile is for GRAAS members.');
  end if;
  insert into public.member_profiles (user_id) values (u) on conflict (user_id) do nothing;
  select * into r from public.member_profiles where user_id = u for update;
  if p ? 'links' then
    l := '{}'::jsonb;
    for bad in select key from jsonb_each_text(coalesce(p -> 'links', '{}'::jsonb)) where key in ('linkedin', 'github', 'website', 'youtube', 'portfolio') loop
      if trim(coalesce(p -> 'links' ->> bad, '')) <> '' and private.clean_url(p -> 'links' ->> bad) is null then
        return private.err('links', 'Check the ' || bad || ' link. It should look like https://example.com/you.');
      end if;
      if private.clean_url(p -> 'links' ->> bad) is not null then l := l || jsonb_build_object(bad, private.clean_url(p -> 'links' ->> bad)); end if;
    end loop;
  end if;
  if p ? 'org_website' and trim(coalesce(p ->> 'org_website', '')) <> '' and private.clean_url(p ->> 'org_website') is null then
    return private.err('org_website', 'Check the website address.');
  end if;
  update public.member_profiles set
    headline = case when p ? 'headline' then nullif(left(trim(coalesce(p ->> 'headline', '')), 160), '') else headline end,
    about = case when p ? 'about' then nullif(left(trim(coalesce(p ->> 'about', '')), 2600), '') else about end,
    skills = case when p ? 'skills' then private.clean_tags(p -> 'skills', 30, 40) else skills end,
    languages = case when p ? 'languages' then private.clean_tags(p -> 'languages', 10, 30) else languages end,
    locations = case when p ? 'locations' then private.clean_tags(p -> 'locations', 5, 40) else locations end,
    open_to = case when p ? 'open_to' then (select coalesce(array_agg(x), '{}') from unnest(private.clean_tags(p -> 'open_to', 6, 20)) x
                                              where x in ('jobs', 'internships', 'projects', 'challenges', 'mentoring', 'sessions')) else open_to end,
    experience = case when p ? 'experience' then private.clean_items(p -> 'experience', array['title', 'org', 'place', 'kind', 'from', 'to', 'current', 'summary'], 15, 120) else experience end,
    education = case when p ? 'education' then private.clean_items(p -> 'education', array['course', 'institute', 'board', 'from', 'to', 'score'], 10, 120) else education end,
    projects = case when p ? 'projects' then private.clean_items(p -> 'projects', array['title', 'role', 'link', 'year', 'summary', 'tools'], 15, 120) else projects end,
    achievements = case when p ? 'achievements' then private.clean_items(p -> 'achievements', array['title', 'year', 'detail'], 20, 120) else achievements end,
    certifications = case when p ? 'certifications' then private.clean_items(p -> 'certifications', array['name', 'issuer', 'year', 'link'], 20, 120) else certifications end,
    links = case when p ? 'links' then l else links end,
    discoverable = case when p ? 'discoverable' then coalesce((p ->> 'discoverable')::boolean, true) else discoverable end,
    org_about = case when p ? 'org_about' then nullif(left(trim(coalesce(p ->> 'org_about', '')), 2600), '') else org_about end,
    org_sector = case when p ? 'org_sector' then nullif(left(trim(coalesce(p ->> 'org_sector', '')), 80), '') else org_sector end,
    org_size = case when p ? 'org_size' then nullif(left(trim(coalesce(p ->> 'org_size', '')), 40), '') else org_size end,
    org_website = case when p ? 'org_website' then private.clean_url(p ->> 'org_website') else org_website end,
    updated_at = now()
  where user_id = u
  returning * into r;
  return jsonb_build_object('ok', true, 'profile', to_jsonb(r));
end $$;

create or replace function public.my_profile() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select to_jsonb(r) from public.member_profiles r where r.user_id = (select auth.uid())),
                  jsonb_build_object('user_id', (select auth.uid()), 'skills', '[]'::jsonb, 'languages', '[]'::jsonb, 'experience', '[]'::jsonb,
                    'education', '[]'::jsonb, 'projects', '[]'::jsonb, 'achievements', '[]'::jsonb, 'certifications', '[]'::jsonb,
                    'links', '{}'::jsonb, 'open_to', '[]'::jsonb, 'locations', '[]'::jsonb, 'discoverable', true))
$$;

-- ---------- which console a login belongs to ----------
-- A chapter that GRAAS removes keeps its record (students, payments) but leaves every list and console.
alter table public.chapters add column if not exists removed_at timestamptz;

create or replace function public.my_role() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'signed_in', (select auth.uid()) is not null,
    'staff', (select s.role from public.staff_members s where s.user_id = (select auth.uid()) and s.is_active),
    'member', exists (select 1 from public.memberships m where m.user_id = (select auth.uid())),
    'coordinator', exists (select 1 from public.chapters c where c.head_user = (select auth.uid()) and c.removed_at is null),
    'name', (select p.full_name from public.profiles p where p.id = (select auth.uid())))
$$;

revoke all on function public.svc_mark_pledged(uuid) from public, anon, authenticated;
grant execute on function public.svc_mark_pledged(uuid) to service_role;
revoke all on function private.pledge_current(), private.norm_name(text), private.clean_items(jsonb, text[], int, int), private.clean_tags(jsonb, int, int), private.clean_url(text) from public, anon, authenticated;
grant execute on function public.member_take_pledge(text), public.member_profile_save(jsonb), public.my_profile(), public.my_role(), public.staff_set_pledge(text, text, text[]) to authenticated;
grant execute on function public.my_role() to anon;
