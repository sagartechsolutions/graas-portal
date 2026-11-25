-- 26 Nov 2026: resume settings gain "show the GRAAS mark" (on unless the member turns it off) and the member's
-- chosen resume skills (at most 12); live member numbers for the About page, shown only when staff switch them on
-- (Admin, Settings, Membership). The numbers are counted from current records: active memberships by type and
-- approved chapters. Nothing is stored or typed in by hand.

create or replace function private.clean_resume_prefs(p jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'template', case when p ->> 'template' in ('modern', 'classic', 'executive', 'compact', 'creative', 'technical') then p ->> 'template' else 'modern' end,
    'show_photo', coalesce((p ->> 'show_photo')::boolean, true),
    'show_qr', coalesce((p ->> 'show_qr')::boolean, true),
    'show_brand', coalesce((p ->> 'show_brand')::boolean, true),
    'one_page', coalesce((p ->> 'one_page')::boolean, false),
    'accent', case when p ->> 'accent' in ('navy', 'green', 'slate', 'teal', 'maroon', 'indigo') then p ->> 'accent' else 'navy' end,
    'hide', coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(case when jsonb_typeof(p -> 'hide') = 'array' then p -> 'hide' else '[]'::jsonb end) x
                      where x in ('about', 'skills', 'experience', 'education', 'projects', 'achievements', 'certifications', 'languages', 'links', 'graas', 'documents')), '[]'::jsonb),
    'skills', coalesce((select jsonb_agg(t.x) from (select left(trim(e.x), 40) x from jsonb_array_elements_text(case when jsonb_typeof(p -> 'skills') = 'array' then p -> 'skills' else '[]'::jsonb end) e(x)
                        where trim(e.x) <> '' limit 12) t), '[]'::jsonb))
$$;

create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  with live as (
    select pl.audience::text audience, pl.code
    from public.memberships m join public.membership_plans pl on pl.id = m.plan_id
    where m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today()))
  select case when coalesce((select (s.value ->> 'show_counts')::boolean from public.site_settings s where s.key = 'membership'), false) then
    jsonb_build_object('show', true,
      'students', (select count(*) from live where audience = 'student' and code <> 'school-student'),
      'school_students', (select count(*) from live where code = 'school-student'),
      'professionals', (select count(*) from live where audience = 'professional'),
      'institutions', (select count(*) from live where audience = 'institution'),
      'industries', (select count(*) from live where audience = 'industry'),
      'chapters', (select count(*) from public.chapters c where c.status = 'approved' and c.removed_at is null and (c.valid_until is null or c.valid_until >= private.today())),
      'as_of', now())
  else jsonb_build_object('show', false) end
$$;
grant execute on function public.public_stats() to anon, authenticated;
