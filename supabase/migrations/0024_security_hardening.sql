-- 0024 Security hardening.
-- 1. Limits on public lookups (member verification and public profiles), per visitor connection.
-- 2. Young members (school students and anyone under 18) show initials only in public verification.
-- 3. Least privilege: visitors who are not signed in can call only the public lookups and read only public content;
--    signed-in users can write directly only to the tables the admin screens edit (row rules still apply on top).
-- 4. New tables and functions start closed to visitors; each public one must be opened on purpose.
-- 5. Resume uploads: PDF or .docx only (old .doc files can carry macros).

-- 1. Request limits ------------------------------------------------------------------------------
create table if not exists private.rate_hits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, key, window_start)
);
alter table private.rate_hits enable row level security;
revoke all on private.rate_hits from public, anon, authenticated;

-- A one-way fingerprint of the visitor's connection (never the address itself).
create or replace function private.client_key() returns text
language plpgsql stable set search_path = '' as $$
declare h jsonb; ip text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    h := null;
  end;
  ip := coalesce(nullif(btrim(h ->> 'cf-connecting-ip'), ''), nullif(btrim(h ->> 'x-real-ip'), ''),
                 nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''));
  if ip is null then return null; end if;
  return encode(extensions.digest(ip || '|graas-limit', 'sha256'), 'hex');
end $$;

-- True while this connection is within p_max calls per p_minutes for the bucket.
create or replace function private.rate_ok(p_bucket text, p_max integer, p_minutes integer) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare k text := private.client_key(); w timestamptz; n integer; v_max integer := p_max;
begin
  if k is null then
    k := 'unknown';
    v_max := p_max * 20;
  end if;
  w := to_timestamp(floor(extract(epoch from now()) / (p_minutes * 60)) * (p_minutes * 60));
  insert into private.rate_hits as r (bucket, key, window_start, hits) values (p_bucket, k, w, 1)
  on conflict (bucket, key, window_start) do update set hits = r.hits + 1
  returning r.hits into n;
  if random() < 0.02 then
    delete from private.rate_hits where window_start < now() - interval '2 days';
  end if;
  return n <= v_max;
end $$;
revoke all on function private.client_key() from public, anon, authenticated;
revoke all on function private.rate_ok(text, integer, integer) from public, anon, authenticated;

-- 2. Public verification -------------------------------------------------------------------------
create or replace function private.initials(p_name text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(string_agg(upper(left(w, 1)) || '.', ' ' order by i), '')
  from unnest(regexp_split_to_array(btrim(coalesce(p_name, '')), '\s+')) with ordinality as t(w, i)
  where w <> '' and i <= 4
$$;

create or replace function private.verify_core(p_no text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('found', true, 'kind', 'member', 'member_no', m.member_no,
       'name', case when y.young then private.initials(p.full_name) else p.full_name end,
       'masked', y.young,
       'plan', pl.name, 'audience', pl.audience,
       'organisation', case when pl.audience::text in ('institution', 'industry') then m.organisation end,
       'chapter', (select private.chapter_label(c) from public.chapters c where c.id = p.chapter_id and c.status = 'approved'),
       'state', case when m.status = 'suspended' then 'suspended'
                     when m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today()) then 'active'
                     when m.status = 'active' then 'expired' else 'inactive' end,
       'member_since', m.starts_on, 'valid_until', m.ends_on)
     from public.memberships m
     join public.profiles p on p.id = m.user_id
     join public.membership_plans pl on pl.id = m.plan_id
     cross join lateral (select coalesce(pl.code = 'school-student' or (p.dob is not null and p.dob > private.today() - interval '18 years'), false) as young) y
     where m.member_no = upper(trim(p_no)) limit 1),
    (select jsonb_build_object('found', true, 'kind', 'chapter', 'member_no', c.code, 'name', private.chapter_label(c),
       'plan', case c.kind when 'school' then 'School chapter' else 'College chapter' end, 'audience', 'chapter',
       'organisation', c.institution, 'chapter', null,
       'members', (select count(*) from public.chapter_members r where r.chapter_id = c.id and r.status = 'active'),
       'state', case when c.status = 'suspended' then 'suspended'
                     when c.status = 'approved' and (c.valid_until is null or c.valid_until >= private.today()) then 'active'
                     when c.status = 'approved' then 'expired' else 'inactive' end,
       'member_since', (c.approved_at at time zone 'Asia/Kolkata')::date, 'valid_until', c.valid_until)
     from public.chapters c where c.code = upper(trim(p_no)) limit 1),
    jsonb_build_object('found', false))
$$;
revoke all on function private.verify_core(text) from public, anon, authenticated;

-- 150 checks an hour and 600 a day per connection: plenty for a busy event, far too few to list every member.
create or replace function public.verify_member(p_no text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_no, '')) > 40 then
    return jsonb_build_object('found', false);
  end if;
  if not private.rate_ok('lookup', 150, 60) or not private.rate_ok('lookup_day', 600, 1440) then
    return jsonb_build_object('found', false, 'limited', true);
  end if;
  return private.verify_core(p_no);
end $$;

-- member_public counts as one lookup through verify_member, so it must be allowed to write the counter.
alter function public.member_public(text) volatile;

create or replace function public.member_public_seen(p_no text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.rate_ok('seen', 30, 60) then return; end if;
  update public.member_profiles mp set public_views = mp.public_views + 1
  from public.memberships m
  where m.member_no = upper(trim(p_no)) and mp.user_id = m.user_id and private.profile_public(m.user_id::text)
    and m.user_id is distinct from (select auth.uid());
end $$;

-- 3a. Functions: only the public lookups stay open to visitors -----------------------------------
do $$
declare
  f record;
  keep text[] := array['public_chapters', 'public_event', 'public_events', 'public_opportunities', 'public_opportunity', 'public_stats',
                       'verify_member', 'member_public', 'member_public_seen', 'submit_lead', 'messaging_channels', 'my_role',
                       'member_events', 'member_opportunities'];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname,
           has_function_privilege('authenticated', p.oid, 'execute') as a,
           has_function_privilege('service_role', p.oid, 'execute') as s
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    if f.a then execute format('grant execute on function %s to authenticated', f.sig); end if;
    if f.s then execute format('grant execute on function %s to service_role', f.sig); end if;
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname = any (keep) then execute format('grant execute on function %s to anon', f.sig); end if;
  end loop;
end $$;

-- 3b. Tables: visitors read only public content ---------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.gallery_items, public.membership_plans, public.membership_terms, public.policies, public.posts,
  public.site_settings, public.pledge_texts to anon;

-- 3c. Signed-in users: direct writes only where the admin screens edit rows (row rules decide who) --
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.applications, public.audit_log, public.event_payouts, public.event_registrations,
  public.events, public.experts, public.member_documents, public.member_profiles, public.memberships, public.opportunities,
  public.opportunity_saves, public.orders, public.payment_events, public.pledge_texts, public.refunds, public.wa_messages,
  public.wa_threads, public.chapters, public.chapter_members, public.messages, public.plan_change_requests from authenticated;
revoke insert, delete on public.profiles, public.leads, public.staff_members from authenticated;
revoke delete on public.membership_plans, public.site_settings, public.tickets from authenticated;

-- 4. Future objects start closed -------------------------------------------------------------------
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from authenticated;

-- 5. Resume uploads ------------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
                               'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'member-docs';

do $$
declare d text := pg_get_functiondef('public.member_doc_add(jsonb)'::regprocedure);
begin
  d := replace(d, '''application/pdf'', ''application/msword'', ''application/vnd', '''application/pdf'', ''application/vnd');
  d := replace(d, 'Upload your resume as a PDF or Word file.', 'Upload your resume as a PDF or a Word (.docx) file.');
  if position('application/msword' in d) > 0 then
    raise exception 'member_doc_add was not updated';
  end if;
  execute d;
end $$;
