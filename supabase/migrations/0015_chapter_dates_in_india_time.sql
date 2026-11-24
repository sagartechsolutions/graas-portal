-- A chapter's "member since" date is the day it was approved in India, not in UTC (an approval at 2 am IST is that day).
create or replace function public.public_chapters()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
      'code', c.code, 'kind', c.kind, 'name', c.institution,
      'branch', case when c.kind = 'college' then coalesce(case when c.branch = 'Other' then c.branch_other end, c.branch) end,
      'city', c.city, 'state', c.state, 'since', (c.approved_at at time zone 'Asia/Kolkata')::date,
      'members', (select count(*) from public.chapter_members r where r.chapter_id = c.id and r.status = 'active'))
    order by c.approved_at), '[]'::jsonb)
  from public.chapters c where c.status = 'approved'
$function$;

create or replace function public.verify_member(p_no text)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
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
       'member_since', (c.approved_at at time zone 'Asia/Kolkata')::date, 'valid_until', c.valid_until)
     from public.chapters c where c.code = upper(trim(p_no)) limit 1),
    jsonb_build_object('found', false))
$function$;
