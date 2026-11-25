-- 25 Nov 2026 (night): public profiles with QR, documents, resume settings, host requests from member accounts.
--  * Members choose whether their career profile is public. The QR on the profile, resume, ID card and certificates opens
--    graas.org.in/m/<member number>, which always shows whether the membership is genuine and active, and shows the
--    profile only when the member has made it public. Mobile, email, date of birth, gender and guardian details are never shown.
--  * School students and members under 18 cannot make their profile public; their QR shows the verification only.
--  * Members upload their own resume (PDF or Word) and other certificates (PDF or image), at most 5 MB each and 20 in all.
--    They can ask GRAAS to check a certificate; staff mark it "Verified by GRAAS" or send it back with a note.
--  * A resume marked "share with companies" can be opened by a company the member has applied to (after the member's consent).
--  * Resume settings (design, photo on or off, QR on or off, colour, hidden sections) are saved with the profile.
--  * School students cannot apply to host sessions.

-- 1. Profile settings -------------------------------------------------------------------------------------------------
alter table public.member_profiles
  add column if not exists public_profile boolean not null default false,
  add column if not exists resume_prefs jsonb not null default '{}'::jsonb,
  add column if not exists cover_style text not null default 'circuit',
  add column if not exists public_views integer not null default 0;

-- Can this member's profile be shown publicly right now?
create or replace function private.profile_public(p_owner text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_profiles mp join public.profiles p on p.id = mp.user_id
    where mp.user_id::text = p_owner and mp.public_profile and not private.is_minor(p.dob)
      and exists (select 1 from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
                  where m.user_id = mp.user_id and m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today())
                    and pl.code <> 'school-student'))
$$;
revoke execute on function private.profile_public(text) from public, anon, authenticated;

-- Photos: also visible when the member's profile is public.
create or replace function private.photo_visible(p_owner text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunities o where o.poster::text = p_owner and o.status in ('approved', 'closed'))
    or private.profile_public(p_owner)
    or ((select auth.uid()) is not null and private.member_audience(p_owner::uuid) in ('college', 'professional') and (
          exists (select 1 from public.applications a join public.opportunities o on o.id = a.opportunity_id
                  where a.user_id::text = p_owner and o.poster = (select auth.uid()))
       or (exists (select 1 from public.opportunities o where o.poster = (select auth.uid()) and o.status = 'approved')
           and exists (select 1 from public.member_profiles mp where mp.user_id::text = p_owner and mp.discoverable))))
$$;

create or replace function private.clean_resume_prefs(p jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'template', case when p ->> 'template' in ('modern', 'classic', 'executive', 'compact', 'creative', 'technical') then p ->> 'template' else 'modern' end,
    'show_photo', coalesce((p ->> 'show_photo')::boolean, true),
    'show_qr', coalesce((p ->> 'show_qr')::boolean, true),
    'one_page', coalesce((p ->> 'one_page')::boolean, false),
    'accent', case when p ->> 'accent' in ('navy', 'green', 'slate', 'teal', 'maroon', 'indigo') then p ->> 'accent' else 'navy' end,
    'hide', coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(case when jsonb_typeof(p -> 'hide') = 'array' then p -> 'hide' else '[]'::jsonb end) x
                      where x in ('about', 'skills', 'experience', 'education', 'projects', 'achievements', 'certifications', 'languages', 'links', 'graas', 'documents')), '[]'::jsonb))
$$;

-- Save public profile, cover and resume settings.
create or replace function public.member_profile_prefs(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); pr public.profiles; mp public.member_profiles; v_on boolean;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
  select * into pr from public.profiles where id = u;
  if pr.id is null then return private.err(null, 'Please sign in again.'); end if;
  insert into public.member_profiles (user_id) values (u) on conflict (user_id) do nothing;
  v_on := case when p ? 'public_profile' then coalesce((p ->> 'public_profile')::boolean, false) end;
  if v_on then
    if private.member_audience(u) = 'school' or exists (select 1 from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
                                                        where m.user_id = u and pl.code = 'school-student') then
      return private.err('public_profile', 'School student profiles stay private. Your QR code still shows that your membership is genuine.');
    end if;
    if private.is_minor(pr.dob) then
      return private.err('public_profile', 'Public profiles are for members aged 18 or over. Your QR code still shows that your membership is genuine.');
    end if;
  end if;
  update public.member_profiles set
    public_profile = coalesce(v_on, public_profile),
    resume_prefs = case when p ? 'resume_prefs' then private.clean_resume_prefs(p -> 'resume_prefs') else resume_prefs end,
    cover_style = case when p ->> 'cover_style' in ('circuit', 'grid', 'gradient', 'blueprint', 'plain') then p ->> 'cover_style' else cover_style end,
    updated_at = now()
  where user_id = u returning * into mp;
  return jsonb_build_object('ok', true, 'public_profile', mp.public_profile, 'resume_prefs', mp.resume_prefs, 'cover_style', mp.cover_style,
    'is_public_now', private.profile_public(u::text));
end $$;
revoke execute on function public.member_profile_prefs(jsonb) from public, anon;
grant execute on function public.member_profile_prefs(jsonb) to authenticated;

-- The member's own settings, QR address and view count.
create or replace function public.my_public()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'member_no', (select m.member_no from public.memberships m where m.user_id = (select auth.uid()) and m.member_no is not null order by m.created_at desc limit 1),
    'public_profile', coalesce(mp.public_profile, false),
    'is_public_now', private.profile_public((select auth.uid())::text),
    'resume_prefs', private.clean_resume_prefs(coalesce(mp.resume_prefs, '{}'::jsonb)),
    'cover_style', coalesce(mp.cover_style, 'circuit'),
    'views', coalesce(mp.public_views, 0),
    'can_be_public', not private.is_minor(p.dob) and coalesce(private.member_audience(p.id), '') <> 'school'
      and not exists (select 1 from public.memberships m join public.membership_plans pl on pl.id = m.plan_id where m.user_id = p.id and pl.code = 'school-student'))
  from public.profiles p left join public.member_profiles mp on mp.user_id = p.id
  where p.id = (select auth.uid())
$$;
revoke execute on function public.my_public() from public, anon;
grant execute on function public.my_public() to authenticated;

-- 2. Documents --------------------------------------------------------------------------------------------------------
create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('resume', 'certificate', 'other')),
  title text not null check (char_length(title) between 2 and 120),
  issuer text check (issuer is null or char_length(issuer) <= 120),
  issued_on date,
  path text not null unique,
  file_name text not null,
  mime text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  show_public boolean not null default false,
  share_with_companies boolean not null default false,
  verify_status text not null default 'none' check (verify_status in ('none', 'requested', 'verified', 'rejected')),
  verify_note text,
  verified_by uuid,
  verified_at timestamptz,
  requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_documents_user_idx on public.member_documents (user_id, created_at desc);
create index if not exists member_documents_queue_idx on public.member_documents (verify_status, requested_at) where verify_status = 'requested';
alter table public.member_documents enable row level security;
create policy member_documents_own on public.member_documents for select to authenticated using (user_id = (select auth.uid()));
create policy member_documents_staff on public.member_documents for select to authenticated using (private.is_staff(array['membership_desk']::public.staff_role[]));
create trigger member_documents_audit after insert or update or delete on public.member_documents for each row execute function private.audit_row();

-- Who may open a stored document file.
create or replace function private.doc_visible(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_documents d where d.path = p_name and (
      (d.show_public and private.profile_public(d.user_id::text))
      or (d.kind = 'resume' and d.share_with_companies and (select auth.uid()) is not null and exists (
            select 1 from public.applications a join public.opportunities o on o.id = a.opportunity_id
            where a.user_id = d.user_id and o.poster = (select auth.uid()) and a.member_ok_at is not null))))
$$;
revoke execute on function private.doc_visible(text) from public;
grant execute on function private.doc_visible(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-docs', 'member-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy member_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'member-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy member_docs_select on storage.objects for select to authenticated
  using (bucket_id = 'member-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff(array['membership_desk']::public.staff_role[])));
create policy member_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'member-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy member_docs_shared on storage.objects for select
  using (bucket_id = 'member-docs' and private.doc_visible(name));

create or replace function private.doc_json(d public.member_documents)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', d.id, 'kind', d.kind, 'title', d.title, 'issuer', d.issuer, 'issued_on', d.issued_on, 'path', d.path,
    'file_name', d.file_name, 'mime', d.mime, 'size_bytes', d.size_bytes, 'show_public', d.show_public, 'share_with_companies', d.share_with_companies,
    'verify_status', d.verify_status, 'verify_note', d.verify_note, 'verified_at', d.verified_at, 'requested_at', d.requested_at, 'created_at', d.created_at)
$$;

create or replace function public.my_documents()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(private.doc_json(d) order by d.kind = 'resume' desc, d.created_at desc), '[]'::jsonb)
  from public.member_documents d where d.user_id = (select auth.uid())
$$;
revoke execute on function public.my_documents() from public, anon;
grant execute on function public.my_documents() to authenticated;

-- Record a file the member has just uploaded to member-docs/<user id>/<file>.
create or replace function public.member_doc_add(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); v_path text := trim(coalesce(p ->> 'path', '')); o record; v_kind text := p ->> 'kind';
  v_title text := trim(coalesce(p ->> 'title', '')); d public.member_documents; v_size bigint; v_mime text;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
  if v_kind not in ('resume', 'certificate', 'other') then return private.err('kind', 'Choose what kind of document this is.'); end if;
  if split_part(v_path, '/', 1) <> u::text or v_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{4,80}$' then return private.err(null, 'The upload could not be matched to your account. Please try again.'); end if;
  if (select count(*) from public.member_documents where user_id = u) >= 20 then return private.err(null, 'You can keep up to 20 documents. Remove one to add another.'); end if;
  if v_kind = 'resume' and (select count(*) from public.member_documents where user_id = u and kind = 'resume') >= 3 then
    return private.err('kind', 'You can keep up to 3 resumes. Remove an older one first.');
  end if;
  if char_length(v_title) < 2 then return private.err('title', 'Give the document a name, for example "PLC programming certificate".'); end if;
  select so.metadata into o from storage.objects so where so.bucket_id = 'member-docs' and so.name = v_path;
  if not found then return private.err(null, 'The file did not finish uploading. Please try again.'); end if;
  v_size := coalesce((o.metadata ->> 'size')::bigint, 0);
  v_mime := coalesce(o.metadata ->> 'mimetype', '');
  if v_size <= 0 or v_size > 5242880 then return private.err(null, 'Files can be up to 5 MB.'); end if;
  if v_kind = 'resume' and v_mime not in ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') then
    return private.err(null, 'Upload your resume as a PDF or Word file.');
  end if;
  if v_kind <> 'resume' and v_mime not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    return private.err(null, 'Upload certificates as a PDF or an image (JPG, PNG or WebP).');
  end if;
  insert into public.member_documents (user_id, kind, title, issuer, issued_on, path, file_name, mime, size_bytes)
  values (u, v_kind, left(v_title, 120), nullif(left(trim(coalesce(p ->> 'issuer', '')), 120), ''),
    case when coalesce(p ->> 'issued_on', '') ~ '^\d{4}-\d{2}-\d{2}$' and (p ->> 'issued_on')::date <= private.today() then (p ->> 'issued_on')::date end,
    v_path, left(coalesce(nullif(trim(p ->> 'file_name'), ''), split_part(v_path, '/', 2)), 120), v_mime, v_size)
  returning * into d;
  return jsonb_build_object('ok', true, 'document', private.doc_json(d));
end $$;
revoke execute on function public.member_doc_add(jsonb) from public, anon;
grant execute on function public.member_doc_add(jsonb) to authenticated;

create or replace function public.member_doc_update(p_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); d public.member_documents; v_title text; v_issuer text; v_date date; v_changed boolean;
begin
  select * into d from public.member_documents where id = p_id and user_id = u;
  if d.id is null then return private.err(null, 'Document not found.'); end if;
  v_title := case when p ? 'title' then left(trim(coalesce(p ->> 'title', '')), 120) else d.title end;
  if char_length(v_title) < 2 then return private.err('title', 'Give the document a name.'); end if;
  v_issuer := case when p ? 'issuer' then nullif(left(trim(coalesce(p ->> 'issuer', '')), 120), '') else d.issuer end;
  v_date := case when p ? 'issued_on' then case when coalesce(p ->> 'issued_on', '') ~ '^\d{4}-\d{2}-\d{2}$' and (p ->> 'issued_on')::date <= private.today()
                                             then (p ->> 'issued_on')::date end else d.issued_on end;
  v_changed := v_title is distinct from d.title or v_issuer is distinct from d.issuer or v_date is distinct from d.issued_on;
  update public.member_documents set title = v_title, issuer = v_issuer, issued_on = v_date,
    show_public = coalesce((p ->> 'show_public')::boolean, show_public),
    share_with_companies = case when kind = 'resume' then coalesce((p ->> 'share_with_companies')::boolean, share_with_companies) else false end,
    verify_status = case when v_changed and verify_status in ('verified', 'requested') then 'none' else verify_status end,
    verify_note = case when v_changed and verify_status in ('verified', 'requested') then null else verify_note end,
    verified_at = case when v_changed then null else verified_at end,
    verified_by = case when v_changed then null else verified_by end,
    updated_at = now()
  where id = d.id returning * into d;
  return jsonb_build_object('ok', true, 'document', private.doc_json(d), 'reset', v_changed);
end $$;
revoke execute on function public.member_doc_update(uuid, jsonb) from public, anon;
grant execute on function public.member_doc_update(uuid, jsonb) to authenticated;

-- The app removes the stored file first (storage policy lets the owner do that), then this removes the record.
create or replace function public.member_doc_remove(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); v_n int;
begin
  delete from public.member_documents where id = p_id and user_id = u;
  get diagnostics v_n = row_count;
  if v_n = 0 then return private.err(null, 'Document not found.'); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.member_doc_remove(uuid) from public, anon;
grant execute on function public.member_doc_remove(uuid) to authenticated;

create or replace function public.member_doc_request_verify(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); d public.member_documents; pr public.profiles;
begin
  select * into d from public.member_documents where id = p_id and user_id = u;
  if d.id is null then return private.err(null, 'Document not found.'); end if;
  if d.kind = 'resume' then return private.err(null, 'GRAAS checks certificates, not resumes.'); end if;
  if d.verify_status = 'verified' then return jsonb_build_object('ok', true, 'document', private.doc_json(d)); end if;
  if d.verify_status = 'requested' then return private.err(null, 'GRAAS is already checking this certificate.'); end if;
  if char_length(coalesce(d.issuer, '')) < 2 then return private.err('issuer', 'Add who issued the certificate first, so GRAAS knows whom to check with.'); end if;
  if (select count(*) from public.member_documents where user_id = u and verify_status = 'requested') >= 5 then
    return private.err(null, 'You can have up to 5 certificates waiting for a check at a time.');
  end if;
  update public.member_documents set verify_status = 'requested', verify_note = null, requested_at = now(), updated_at = now()
  where id = d.id returning * into d;
  select * into pr from public.profiles where id = u;
  perform private.enqueue_staff('staff_doc_verify', jsonb_build_object('member', pr.full_name, 'document', d.title, 'issuer', d.issuer,
    'link', 'https://graas.org.in/admin?tab=documents'));
  return jsonb_build_object('ok', true, 'document', private.doc_json(d));
end $$;
revoke execute on function public.member_doc_request_verify(uuid) from public, anon;
grant execute on function public.member_doc_request_verify(uuid) to authenticated;

-- Staff: certificates waiting for a check (or all of one member's documents).
create or replace function public.staff_documents(p_status text default 'requested', p_search text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff(array['membership_desk']::public.staff_role[]) then return private.err(null, 'Not allowed.'); end if;
  return jsonb_build_object('ok', true, 'counts', (select jsonb_object_agg(s, n) from (select verify_status s, count(*) n from public.member_documents group by 1) c),
    'items', coalesce((select jsonb_agg(private.doc_json(d) || jsonb_build_object('user_id', d.user_id, 'name', p.full_name, 'email', p.email,
        'member_no', (select m.member_no from public.memberships m where m.user_id = d.user_id and m.member_no is not null order by m.created_at desc limit 1))
      order by coalesce(d.requested_at, d.created_at) desc)
      from public.member_documents d join public.profiles p on p.id = d.user_id
      where (coalesce(p_status, 'all') = 'all' or d.verify_status = p_status)
        and (coalesce(trim(p_search), '') = '' or p.full_name ilike '%' || trim(p_search) || '%' or p.email ilike '%' || trim(p_search) || '%'
             or d.title ilike '%' || trim(p_search) || '%'
             or exists (select 1 from public.memberships m where m.user_id = d.user_id and m.member_no ilike '%' || trim(p_search) || '%'))
      limit 200), '[]'::jsonb));
end $$;
revoke execute on function public.staff_documents(text, text) from public, anon;
grant execute on function public.staff_documents(text, text) to authenticated;

create or replace function public.staff_doc_action(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d public.member_documents; v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if not private.is_staff(array['membership_desk']::public.staff_role[]) then return private.err(null, 'Not allowed.'); end if;
  select * into d from public.member_documents where id = p_id;
  if d.id is null then return private.err(null, 'Document not found.'); end if;
  if p_action = 'verify' then
    update public.member_documents set verify_status = 'verified', verify_note = v_note, verified_by = (select auth.uid()), verified_at = now(), updated_at = now()
    where id = d.id returning * into d;
    perform private.enqueue(d.user_id, 'doc_verified', jsonb_build_object('document', d.title, 'link', 'https://graas.org.in/account?tab=documents'), 'doc_verified:' || d.id::text, null);
  elsif p_action = 'reject' then
    if v_note is null then return private.err('note', 'Tell the member what is missing or wrong.'); end if;
    update public.member_documents set verify_status = 'rejected', verify_note = v_note, verified_by = (select auth.uid()), verified_at = null, updated_at = now()
    where id = d.id returning * into d;
    perform private.enqueue(d.user_id, 'doc_rejected', jsonb_build_object('document', d.title, 'note', v_note, 'link', 'https://graas.org.in/account?tab=documents'),
      'doc_rejected:' || d.id::text || ':' || extract(epoch from now())::bigint::text, null);
  elsif p_action = 'reset' then
    update public.member_documents set verify_status = 'none', verify_note = v_note, verified_by = null, verified_at = null, updated_at = now()
    where id = d.id returning * into d;
  else
    return private.err(null, 'Unknown action.');
  end if;
  return jsonb_build_object('ok', true, 'document', private.doc_json(d));
end $$;
revoke execute on function public.staff_doc_action(uuid, text, text) from public, anon;
grant execute on function public.staff_doc_action(uuid, text, text) to authenticated;

-- 3. The public page behind the QR ---------------------------------------------------------------------------------------
create or replace function public.member_public(p_no text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb := public.verify_member(p_no); m public.memberships; pl public.membership_plans; p public.profiles; mp public.member_profiles;
  v_public boolean; v_org boolean; c public.chapters;
begin
  if not coalesce((v ->> 'found')::boolean, false) then return v; end if;
  if v ->> 'kind' = 'chapter' then
    select * into c from public.chapters where code = upper(trim(p_no)) limit 1;
    return v || jsonb_build_object('branch', c.branch, 'city', c.city,
      'events', coalesce((select jsonb_agg(jsonb_build_object('ref', e.ref, 'title', e.title, 'kind', e.kind, 'starts_at', e.starts_at) order by e.starts_at desc)
        from (select * from public.events e where e.chapter_id = c.id and e.status = 'approved' order by e.starts_at desc limit 12) e), '[]'::jsonb));
  end if;
  select * into m from public.memberships where member_no = upper(trim(p_no)) limit 1;
  select * into pl from public.membership_plans where id = m.plan_id;
  select * into p from public.profiles where id = m.user_id;
  select * into mp from public.member_profiles where user_id = m.user_id;
  v_org := pl.audience::text in ('institution', 'industry');
  v_public := v ->> 'state' = 'active' and private.profile_public(m.user_id::text);
  v := v || jsonb_build_object('school', pl.code = 'school-student', 'pledged', p.pledged_at is not null, 'public', v_public, 'org', v_org,
    'verified_docs', (select count(*) from public.member_documents d where d.user_id = m.user_id and d.verify_status = 'verified'),
    'events_attended', (select count(*) from public.event_registrations r where r.user_id = m.user_id and r.status = 'attended'));
  if not v_public then return v; end if;
  return v || jsonb_build_object(
    'photo', case when p.photo_updated_at is not null then jsonb_build_object('path', p.id::text || '/photo.jpg', 'v', floor(extract(epoch from p.photo_updated_at))::bigint) end,
    'cover_style', mp.cover_style,
    'views', mp.public_views,
    'profile', jsonb_build_object(
      'headline', mp.headline, 'about', mp.about, 'skills', to_jsonb(mp.skills), 'languages', to_jsonb(mp.languages),
      'experience', mp.experience, 'education', mp.education, 'projects', mp.projects, 'achievements', mp.achievements,
      'certifications', mp.certifications, 'links', mp.links, 'open_to', to_jsonb(mp.open_to), 'locations', to_jsonb(mp.locations),
      'city', p.city, 'state', p.state, 'organisation', p.organisation, 'designation', p.designation,
      'course', coalesce(nullif(p.course_other, ''), p.course), 'branch', coalesce(nullif(p.branch_other, ''), p.branch), 'study_year', p.study_year,
      'org_about', mp.org_about, 'org_sector', mp.org_sector, 'org_size', mp.org_size, 'org_website', coalesce(mp.org_website, p.website)),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'title', d.title, 'issuer', d.issuer, 'issued_on', d.issued_on,
        'path', d.path, 'mime', d.mime, 'verified', d.verify_status = 'verified') order by d.verify_status = 'verified' desc, d.issued_on desc nulls last)
      from public.member_documents d where d.user_id = m.user_id and d.show_public), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('ref', e.ref, 'title', e.title, 'kind', e.kind, 'starts_at', e.starts_at) order by e.starts_at desc)
      from public.event_registrations r join public.events e on e.id = r.event_id where r.user_id = m.user_id and r.status = 'attended'), '[]'::jsonb),
    'opportunities', case when v_org then coalesce((select jsonb_agg(jsonb_build_object('ref', o.ref, 'title', o.title, 'kind', o.kind, 'location', o.location,
        'work_mode', o.work_mode, 'apply_by', o.apply_by) order by o.created_at desc)
      from public.opportunities o where o.poster = m.user_id and o.status = 'approved' and (o.apply_by is null or o.apply_by >= private.today())), '[]'::jsonb) end);
end $$;
grant execute on function public.member_public(text) to anon, authenticated;

-- Count a visit to a public profile (once per browser session; the page calls it).
create or replace function public.member_public_seen(p_no text)
returns void language sql security definer set search_path = '' as $$
  update public.member_profiles mp set public_views = mp.public_views + 1
  from public.memberships m where m.member_no = upper(trim(p_no)) and mp.user_id = m.user_id and private.profile_public(m.user_id::text)
    and m.user_id is distinct from (select auth.uid());
$$;
grant execute on function public.member_public_seen(text) to anon, authenticated;

-- 4. Hosting sessions: not for school students ----------------------------------------------------------------------
create or replace function public.expert_apply(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare u uuid := (select auth.uid()); x public.experts; pr public.profiles; v_name text;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
  if private.member_audience(u) = 'school' then return private.err(null, 'School students take part through their school chapter, which can propose events.'); end if;
  select * into pr from public.profiles where id = u;
  select * into x from public.experts where user_id = u;
  if x.status = 'approved' and not coalesce((p ->> 'update')::boolean, false) then return jsonb_build_object('ok', true, 'status', 'approved'); end if;
  v_name := coalesce(nullif(trim(p ->> 'full_name'), ''), pr.full_name);
  if char_length(coalesce(v_name, '')) < 3 then return private.err('full_name', 'Enter your full name.'); end if;
  if char_length(trim(coalesce(p ->> 'headline', ''))) < 5 then return private.err('headline', 'Add a one-line headline, for example "Head of automation, ACME Motors".'); end if;
  if char_length(trim(coalesce(p ->> 'bio', ''))) < 60 then return private.err('bio', 'Tell members about your experience in a few lines (at least 60 characters).'); end if;
  if trim(coalesce(p ->> 'linkedin', '')) <> '' and private.clean_url(p ->> 'linkedin') is null then return private.err('linkedin', 'Check the LinkedIn link.'); end if;
  insert into public.experts (user_id, full_name, headline, bio, expertise, organisation, designation, linkedin, website, status)
  values (u, left(v_name, 120), left(trim(p ->> 'headline'), 160), left(trim(p ->> 'bio'), 2000), private.clean_tags(p -> 'expertise', 12, 40),
    nullif(left(trim(coalesce(p ->> 'organisation', '')), 120), ''), nullif(left(trim(coalesce(p ->> 'designation', '')), 120), ''),
    private.clean_url(p ->> 'linkedin'), private.clean_url(p ->> 'website'), 'pending')
  on conflict (user_id) do update set full_name = excluded.full_name, headline = excluded.headline, bio = excluded.bio, expertise = excluded.expertise,
    organisation = excluded.organisation, designation = excluded.designation, linkedin = excluded.linkedin, website = excluded.website,
    status = case when public.experts.status = 'approved' then 'approved' else 'pending' end
  returning * into x;
  if x.status = 'pending' then
    perform private.enqueue_staff('staff_expert_new', jsonb_build_object('expert', x.full_name, 'headline', x.headline, 'link', 'https://graas.org.in/admin'));
  end if;
  return jsonb_build_object('ok', true, 'status', x.status);
end $function$;

-- 5. Messages ---------------------------------------------------------------------------------------------------------
create or replace function private.msg_topic(p_event text)
returns text language sql immutable set search_path = '' as $$
  select case p_event
    when 'opp_invite' then 'opportunity invitations'
    when 'opp_application_new' then 'opportunity post'
    when 'opp_invite_accepted' then 'opportunity post'
    when 'opportunity_approved' then 'opportunity post'
    when 'opportunity_rejected' then 'opportunity post'
    when 'chapter_submitted' then 'chapter application'
    when 'chapter_approved' then 'chapter'
    when 'chapter_rejected' then 'chapter application'
    when 'event_approved' then 'event proposal'
    when 'event_rejected' then 'event proposal'
    when 'event_fee_due' then 'event proposal'
    when 'expert_approved' then 'expert application'
    when 'expert_rejected' then 'expert application'
    when 'application_approved' then 'membership application'
    when 'payment_failed' then 'payment'
    when 'plan_change_received' then 'membership'
    when 'doc_verified' then 'certificate check'
    when 'doc_rejected' then 'certificate check'
    else 'account' end
$$;

insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_lang, wa_category, wa_params, sort) values
 ('doc_verified', 'email', 'member', 'Certificate verified', 'Sent when GRAAS marks a member''s uploaded certificate as verified.', true, false,
  'Your certificate is verified by GRAAS',
  E'Hi {{name}},\n\nGRAAS has checked **{{document}}** and marked it **Verified by GRAAS**. The badge now shows on your profile, and on your public profile if you show this certificate there.\n\n[Open your documents]({{link}})',
  null, 'en', null, '{}', 120),
 ('doc_verified', 'whatsapp', 'member', 'Certificate verified', 'Short WhatsApp note that points to the account for the details.', true, false, null,
  'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.',
  'graas_account_update', 'en', 'UTILITY', '{name,topic}', 120),
 ('doc_rejected', 'email', 'member', 'Certificate sent back', 'Sent when GRAAS cannot verify an uploaded certificate yet.', true, false,
  'Your certificate needs a change',
  E'Hi {{name}},\n\nGRAAS could not verify **{{document}}** yet.\n\n**What to do:** {{note}}\n\nYou can upload a clearer copy or add the missing details, then ask again.\n\n[Open your documents]({{link}})',
  null, 'en', null, '{}', 121),
 ('doc_rejected', 'whatsapp', 'member', 'Certificate sent back', 'Short WhatsApp note that points to the account for the details.', true, false, null,
  'Hi {{1}}, there is an update on your GRAAS {{2}}. Please sign in at graas.org.in/account to see the details.',
  'graas_account_update', 'en', 'UTILITY', '{name,topic}', 121),
 ('staff_doc_verify', 'email', 'staff', 'Staff: certificate to check', 'Sent to the staff alert address when a member asks GRAAS to verify a certificate.', true, false,
  'Certificate to check: {{member}}',
  E'Hi {{name}},\n\n**{{member}}** has asked GRAAS to verify **{{document}}**, issued by {{issuer}}.\n\nCheck it in Admin, under Documents.\n\n[Open admin]({{link}})',
  null, 'en', null, '{}', 122)
on conflict (event, channel) do nothing;
