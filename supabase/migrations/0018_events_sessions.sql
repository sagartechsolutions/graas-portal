-- 25 Nov 2026, stage 3: events, live sessions and webinars.
--  * GRAAS runs sessions, lectures, workshops and conferences with a member price (free or discounted) and a public price.
--  * Chapters announce competitions, workshops and meetups; GRAAS approves them. Chapter events are free.
--  * Anyone can apply to be an expert; GRAAS approves the expert, then each session. For each paid expert session admin
--    picks the money model: ticket_share (GRAAS sells tickets and keeps a platform fee, then pays the expert) or
--    listing_fee (the expert pays GRAAS to publish; attendees join free).
--  * Tickets and listing fees are orders like membership payments (orders.event_id / registration_id), so receipts,
--    refunds and the Razorpay webhook work unchanged.
--  * Hosts or staff mark attendance; attendees then get a participation certificate.

create table if not exists public.experts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  headline text,
  bio text,
  expertise text[] not null default '{}',
  organisation text,
  designation text,
  linkedin text,
  website text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paused')),
  staff_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.experts enable row level security;
create policy experts_own on public.experts for select using (user_id = (select auth.uid()));
create policy experts_staff on public.experts for select using (private.is_staff(null));
create trigger experts_updated before update on public.experts for each row execute function public.set_updated_at();

create sequence if not exists private.event_no_seq;
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null default ('GRAAS-EVT-' || lpad(nextval('private.event_no_seq')::text, 5, '0')),
  kind text not null check (kind in ('webinar', 'live_session', 'lecture', 'workshop', 'conference', 'competition', 'meetup', 'industrial_visit')),
  title text not null check (char_length(title) between 5 and 140),
  summary text check (summary is null or char_length(summary) <= 220),
  description text not null check (char_length(description) between 30 and 8000),
  host_type text not null check (host_type in ('graas', 'chapter', 'expert')),
  host_user uuid references public.profiles(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  speaker_name text check (speaker_name is null or char_length(speaker_name) <= 120),
  speaker_title text check (speaker_title is null or char_length(speaker_title) <= 160),
  speaker_bio text check (speaker_bio is null or char_length(speaker_bio) <= 1500),
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text not null default 'online' check (mode in ('online', 'offline', 'hybrid')),
  venue text check (venue is null or char_length(venue) <= 200),
  city text check (city is null or char_length(city) <= 80),
  join_link text check (join_link is null or char_length(join_link) <= 400),
  capacity int check (capacity is null or capacity between 1 and 100000),
  register_by timestamptz,
  audience text[] not null default '{school,college,professional,public}' check (audience <@ array['school', 'college', 'professional', 'public'] and cardinality(audience) > 0),
  chapter_only boolean not null default false,
  price_member_paise int not null default 0 check (price_member_paise between 0 and 10000000),
  price_public_paise int not null default 0 check (price_public_paise between 0 and 10000000),
  money_model text not null default 'none' check (money_model in ('none', 'ticket_share', 'listing_fee')),
  platform_fee_pct numeric(5, 2) not null default 20 check (platform_fee_pct between 0 and 100),
  listing_fee_paise int not null default 0 check (listing_fee_paise between 0 and 10000000),
  listing_paid_at timestamptz,
  certificate boolean not null default true,
  topics text[] not null default '{}',
  status text not null default 'pending' check (status in ('draft', 'pending', 'awaiting_fee', 'approved', 'rejected', 'paused', 'cancelled', 'completed', 'removed')),
  staff_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_status_idx on public.events (status, starts_at);
alter table public.events enable row level security;
create policy events_host on public.events for select using (host_user = (select auth.uid()));
create policy events_staff on public.events for select using (private.is_staff(null));
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('pending_payment', 'registered', 'cancelled', 'attended', 'absent')),
  amount_paise int not null default 0,
  member_price boolean not null default false,
  order_id uuid,
  attended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.event_registrations enable row level security;
create policy event_regs_own on public.event_registrations for select using (user_id = (select auth.uid()));
create policy event_regs_staff on public.event_registrations for select using (private.is_staff(null));
create trigger event_regs_updated before update on public.event_registrations for each row execute function public.set_updated_at();

create table if not exists public.event_payouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  expert_user uuid references public.profiles(id) on delete set null,
  gross_paise int not null,
  fee_paise int not null,
  net_paise int not null,
  reference text not null,
  paid_on date not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.event_payouts enable row level security;
create policy event_payouts_own on public.event_payouts for select using (expert_user = (select auth.uid()));
create policy event_payouts_staff on public.event_payouts for select using (private.is_staff(array['finance', 'event_manager']::public.staff_role[]));

alter table public.orders add column if not exists event_id uuid references public.events(id) on delete set null;
alter table public.orders add column if not exists registration_id uuid references public.event_registrations(id) on delete set null;

-- ---------- helpers ----------

create or replace function private.is_member(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.user_id = p_user and m.status = 'active' and (m.ends_on is null or m.ends_on >= private.today()))
$$;

/** Which event audiences a login belongs to: school, college or professional (organisations count as professional), else public. */
create or replace function private.event_audience(p_user uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_audience(p_user), case when private.is_member(p_user) then 'professional' end, 'public')
$$;

create or replace function private.event_kind_label(p text) returns text language sql immutable set search_path = '' as $$
  select case p when 'webinar' then 'Webinar' when 'live_session' then 'Live session' when 'lecture' then 'Industry lecture' when 'workshop' then 'Workshop'
                when 'conference' then 'Conference' when 'competition' then 'Competition' when 'meetup' then 'Meetup' when 'industrial_visit' then 'Industrial visit'
                else initcap(replace(p, '_', ' ')) end
$$;

create or replace function private.event_seats(p_event uuid) returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.event_registrations r where r.event_id = p_event
   and (r.status in ('registered', 'attended') or (r.status = 'pending_payment' and r.created_at > now() - interval '30 minutes'))
$$;

create or replace function private.event_json(e public.events) returns jsonb language sql stable security definer set search_path = '' as $$
  select (to_jsonb(e) - 'join_link' - 'staff_note' - 'decided_by' - 'created_by' - 'host_user' - 'listing_fee_paise' - 'platform_fee_pct' - 'listing_paid_at')
    || jsonb_build_object(
      'kind_label', private.event_kind_label(e.kind),
      'host', case e.host_type
                when 'chapter' then (select jsonb_build_object('name', private.chapter_label(c), 'code', c.code) from public.chapters c where c.id = e.chapter_id)
                when 'expert' then (select jsonb_build_object('name', x.full_name, 'headline', x.headline, 'organisation', x.organisation) from public.experts x where x.user_id = e.host_user)
                else jsonb_build_object('name', 'GRAAS') end,
      'seats_taken', private.event_seats(e.id),
      'open', e.status = 'approved' and e.starts_at > now() and (e.register_by is null or e.register_by > now())
              and (e.capacity is null or private.event_seats(e.id) < e.capacity),
      'past', coalesce(e.ends_at, e.starts_at + interval '2 hours') < now())
$$;

/** Staff with the events role, the expert who hosts, or the coordinator of the hosting chapter. */
create or replace function private.can_manage_event(e public.events) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff(array['event_manager']::public.staff_role[]) or e.host_user = (select auth.uid())
      or exists (select 1 from public.chapters c where c.id = e.chapter_id and c.head_user = (select auth.uid()) and c.removed_at is null)
$$;

-- ---------- experts ----------

create or replace function public.expert_apply(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); x public.experts; pr public.profiles; v_name text;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
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
end $$;

create or replace function public.my_expert() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', p.full_name, 'email', p.email, 'phone', p.phone, 'organisation', p.organisation, 'designation', p.designation)
                from public.profiles p where p.id = (select auth.uid())),
    'expert', (select to_jsonb(x) - 'decided_by' from public.experts x where x.user_id = (select auth.uid())),
    'events', coalesce((select jsonb_agg(private.event_json(e) || jsonb_build_object('join_link', e.join_link, 'staff_note', e.staff_note,
        'money', jsonb_build_object('model', e.money_model, 'fee_pct', e.platform_fee_pct, 'listing_fee_paise', e.listing_fee_paise, 'listing_paid', e.listing_paid_at is not null),
        'registered', (select count(*) from public.event_registrations r where r.event_id = e.id and r.status in ('registered', 'attended')),
        'gross_paise', (select coalesce(sum(o.total_paise - coalesce(o.refunded_paise, 0)), 0) from public.orders o where o.event_id = e.id and o.registration_id is not null and o.status in ('paid', 'refunded')),
        'payout', (select to_jsonb(po) - 'recorded_by' from public.event_payouts po where po.event_id = e.id))
      order by e.starts_at desc) from public.events e where e.host_type = 'expert' and e.host_user = (select auth.uid()) and e.status <> 'removed'), '[]'::jsonb))
$$;

-- ---------- hosting (experts, chapters, staff) ----------

create or replace function public.host_event_save(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := (select auth.uid()); staff boolean := private.is_staff(array['event_manager']::public.staff_role[]);
  e public.events; v_id uuid := nullif(p ->> 'id', '')::uuid; v_host text; v_chapter uuid; c public.chapters;
  v_kind text := p ->> 'kind'; v_start timestamptz; v_end timestamptz; v_reg timestamptz; v_aud text[]; v_pm int; v_pp int; v_status text;
begin
  if u is null then return private.err(null, 'Please sign in again.'); end if;
  if v_id is not null then
    select * into e from public.events where id = v_id for update;
    if not found or not private.can_manage_event(e) then return private.err(null, 'Event not found.'); end if;
    if e.status in ('cancelled', 'completed', 'removed') and not staff then return private.err(null, 'This event can no longer be changed.'); end if;
    v_host := e.host_type; v_chapter := e.chapter_id;
  elsif staff and coalesce(p ->> 'host_type', 'graas') = 'graas' then
    v_host := 'graas';
  elsif exists (select 1 from public.experts where user_id = u and status = 'approved') and coalesce(p ->> 'host_type', 'expert') = 'expert' then
    v_host := 'expert';
  else
    select * into c from public.chapters where head_user = u and status = 'approved' and removed_at is null order by approved_at desc limit 1;
    if not found then return private.err(null, 'Only GRAAS staff, approved experts and approved chapters can create events.'); end if;
    v_host := 'chapter'; v_chapter := c.id;
  end if;

  if v_kind is null or v_kind not in ('webinar', 'live_session', 'lecture', 'workshop', 'conference', 'competition', 'meetup', 'industrial_visit') then
    return private.err('kind', 'Choose the type of event.');
  end if;
  if v_host = 'chapter' and v_kind not in ('competition', 'workshop', 'meetup', 'lecture', 'industrial_visit') then return private.err('kind', 'Chapters can announce competitions, workshops, lectures, meetups and visits.'); end if;
  if v_host = 'expert' and v_kind not in ('webinar', 'live_session', 'lecture', 'workshop') then return private.err('kind', 'Experts can host webinars, live sessions, lectures and workshops.'); end if;
  if char_length(trim(coalesce(p ->> 'title', ''))) < 5 then return private.err('title', 'Give a clear title.'); end if;
  if char_length(trim(coalesce(p ->> 'description', ''))) < 30 then return private.err('description', 'Describe the event: what happens, who it is for and what people take away.'); end if;
  begin
    v_start := (p ->> 'starts_at')::timestamptz; v_end := nullif(p ->> 'ends_at', '')::timestamptz; v_reg := nullif(p ->> 'register_by', '')::timestamptz;
  exception when others then return private.err('starts_at', 'Check the date and time.');
  end;
  if v_start is null then return private.err('starts_at', 'Choose when it starts.'); end if;
  if v_start < now() + interval '1 hour' and (v_id is null or v_start is distinct from e.starts_at) then return private.err('starts_at', 'The start time must be in the future.'); end if;
  if v_end is not null and v_end <= v_start then return private.err('ends_at', 'The end must be after the start.'); end if;
  if coalesce(p ->> 'mode', 'online') not in ('online', 'offline', 'hybrid') then return private.err('mode', 'Choose online, offline or hybrid.'); end if;
  if coalesce(p ->> 'mode', 'online') <> 'online' and char_length(trim(coalesce(p ->> 'venue', ''))) < 3 then return private.err('venue', 'Give the venue for an offline event.'); end if;
  if trim(coalesce(p ->> 'join_link', '')) <> '' and private.clean_url(p ->> 'join_link') is null then return private.err('join_link', 'Check the joining link (it should start with https://).'); end if;
  select coalesce(array_agg(distinct x), '{}') into v_aud from jsonb_array_elements_text(coalesce(p -> 'audience', '[]'::jsonb)) x
   where x in ('school', 'college', 'professional', 'public');
  if cardinality(v_aud) = 0 then return private.err('audience', 'Choose who can register.'); end if;
  v_pm := greatest(0, round(coalesce(nullif(p ->> 'price_member_inr', '')::numeric, 0) * 100))::int;
  v_pp := greatest(0, round(coalesce(nullif(p ->> 'price_public_inr', '')::numeric, 0) * 100))::int;
  if v_host = 'chapter' then v_pm := 0; v_pp := 0; end if;
  if v_pm > v_pp and v_pp > 0 then return private.err('price_member_inr', 'The member price cannot be higher than the public price.'); end if;
  v_status := case when staff and v_host = 'graas' then coalesce(e.status, 'approved') when (p ->> 'draft')::boolean then 'draft' else 'pending' end;

  if e.id is null then
    insert into public.events (kind, title, summary, description, host_type, host_user, chapter_id, speaker_name, speaker_title, speaker_bio, starts_at, ends_at,
      mode, venue, city, join_link, capacity, register_by, audience, chapter_only, price_member_paise, price_public_paise, certificate, topics, status,
      money_model, created_by, decided_by, decided_at)
    values (v_kind, left(trim(p ->> 'title'), 140), nullif(left(trim(coalesce(p ->> 'summary', '')), 220), ''), left(trim(p ->> 'description'), 8000),
      v_host, case when v_host = 'graas' then null else u end, v_chapter,
      nullif(left(trim(coalesce(p ->> 'speaker_name', '')), 120), ''), nullif(left(trim(coalesce(p ->> 'speaker_title', '')), 160), ''),
      nullif(left(trim(coalesce(p ->> 'speaker_bio', '')), 1500), ''), v_start, v_end, coalesce(p ->> 'mode', 'online'),
      nullif(left(trim(coalesce(p ->> 'venue', '')), 200), ''), nullif(left(trim(coalesce(p ->> 'city', '')), 80), ''), private.clean_url(p ->> 'join_link'),
      nullif(p ->> 'capacity', '')::int, v_reg, v_aud, v_host = 'chapter' and coalesce((p ->> 'chapter_only')::boolean, false), v_pm, v_pp,
      coalesce((p ->> 'certificate')::boolean, true), private.clean_tags(p -> 'topics', 10, 40), v_status,
      'none',
      u, case when v_status = 'approved' then u end, case when v_status = 'approved' then now() end)
    returning * into e;
  else
    update public.events set kind = v_kind, title = left(trim(p ->> 'title'), 140), summary = nullif(left(trim(coalesce(p ->> 'summary', '')), 220), ''),
      description = left(trim(p ->> 'description'), 8000), speaker_name = nullif(left(trim(coalesce(p ->> 'speaker_name', '')), 120), ''),
      speaker_title = nullif(left(trim(coalesce(p ->> 'speaker_title', '')), 160), ''), speaker_bio = nullif(left(trim(coalesce(p ->> 'speaker_bio', '')), 1500), ''),
      starts_at = v_start, ends_at = v_end, mode = coalesce(p ->> 'mode', 'online'), venue = nullif(left(trim(coalesce(p ->> 'venue', '')), 200), ''),
      city = nullif(left(trim(coalesce(p ->> 'city', '')), 80), ''), join_link = private.clean_url(p ->> 'join_link'), capacity = nullif(p ->> 'capacity', '')::int,
      register_by = v_reg, audience = v_aud, chapter_only = v_host = 'chapter' and coalesce((p ->> 'chapter_only')::boolean, false),
      price_member_paise = case when staff or e.status in ('draft', 'pending', 'rejected') then v_pm else price_member_paise end,
      price_public_paise = case when staff or e.status in ('draft', 'pending', 'rejected') then v_pp else price_public_paise end,
      certificate = coalesce((p ->> 'certificate')::boolean, true), topics = private.clean_tags(p -> 'topics', 10, 40),
      status = case when staff then e.status when e.status in ('approved', 'paused', 'awaiting_fee') then e.status
                    when e.status = 'draft' and (p ->> 'draft')::boolean then 'draft' else 'pending' end
    where id = e.id returning * into e;
  end if;
  if e.status = 'pending' then
    perform private.enqueue_staff('staff_event_new', jsonb_build_object('title', e.title, 'kind', private.event_kind_label(e.kind),
      'host', coalesce((private.event_json(e) -> 'host' ->> 'name'), 'GRAAS'), 'when', to_char(e.starts_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
      'link', 'https://graas.org.in/admin'));
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (u, case when v_id is null then 'event_created' else 'event_edited' end, 'events', e.id::text, jsonb_build_object('status', e.status, 'host', v_host));
  return jsonb_build_object('ok', true, 'id', e.id, 'ref', e.ref, 'status', e.status);
end $$;

create or replace function public.host_event_action(p_id uuid, p_action text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; v text;
begin
  select * into e from public.events where id = p_id for update;
  if not found or not private.can_manage_event(e) then return private.err(null, 'Event not found.'); end if;
  v := case when p_action = 'submit' and e.status in ('draft', 'rejected') then 'pending'
            when p_action = 'withdraw' and e.status = 'pending' then 'draft' end;
  if v is null then return private.err(null, 'This cannot be done now. To cancel a published event, write to GRAAS so registrations and payments are handled.'); end if;
  update public.events set status = v where id = e.id;
  if v = 'pending' then
    perform private.enqueue_staff('staff_event_new', jsonb_build_object('title', e.title, 'kind', private.event_kind_label(e.kind),
      'host', coalesce((private.event_json(e) -> 'host' ->> 'name'), 'GRAAS'), 'when', to_char(e.starts_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
      'link', 'https://graas.org.in/admin'));
  end if;
  return jsonb_build_object('ok', true, 'status', v);
end $$;

/** Events a chapter coordinator manages (the chapter console). */
create or replace function public.chapter_events() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(private.event_json(e) || jsonb_build_object('join_link', e.join_link, 'staff_note', e.staff_note,
      'registered', (select count(*) from public.event_registrations r where r.event_id = e.id and r.status in ('registered', 'attended')))
    order by e.starts_at desc), '[]'::jsonb)
  from public.events e join public.chapters c on c.id = e.chapter_id
  where c.head_user = (select auth.uid()) and e.status <> 'removed'
$$;

/** Who registered, for the host or staff. Hosts see names and member types; staff also see email. */
create or replace function public.host_registrations(p_event uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'user_id', r.user_id, 'status', r.status, 'amount_paise', r.amount_paise, 'created_at', r.created_at,
      'attended_at', r.attended_at, 'name', p.full_name, 'organisation', p.organisation, 'city', p.city,
      'member_no', (select m.member_no from public.memberships m where m.user_id = p.id and m.status = 'active' order by m.created_at desc limit 1),
      'email', case when private.is_staff(array['event_manager']::public.staff_role[]) then p.email end,
      'phone', case when private.is_staff(array['event_manager']::public.staff_role[]) then p.phone end)
    order by p.full_name), '[]'::jsonb)
  from public.event_registrations r join public.profiles p on p.id = r.user_id join public.events e on e.id = r.event_id
  where r.event_id = p_event and r.status <> 'pending_payment' and private.can_manage_event(e)
$$;

create or replace function public.host_attendance(p_event uuid, p_ids uuid[], p_attended boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; n int;
begin
  select * into e from public.events where id = p_event;
  if not found or not private.can_manage_event(e) then return private.err(null, 'Event not found.'); end if;
  if e.starts_at > now() then return private.err(null, 'Attendance can be marked once the event has started.'); end if;
  update public.event_registrations set status = case when p_attended then 'attended' else 'absent' end,
    attended_at = case when p_attended then coalesce(attended_at, now()) end
  where event_id = e.id and id = any (coalesce(p_ids, '{}')) and status in ('registered', 'attended', 'absent');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'updated', n);
end $$;

-- ---------- members ----------

/** Events open to the signed-in user, their price for this user, plus the user's own registrations and certificates. */
create or replace function public.member_events() returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) u, private.event_audience((select auth.uid())) aud, private.is_member((select auth.uid())) mem,
                     (select p.chapter_id from public.profiles p where p.id = (select auth.uid())) ch)
  select jsonb_build_object(
    'member', (select mem from me),
    'audience', (select aud from me),
    'upcoming', coalesce((select jsonb_agg(private.event_json(e) || jsonb_build_object(
        'my_price_paise', case when me.mem then e.price_member_paise else e.price_public_paise end,
        'my_status', (select r.status from public.event_registrations r where r.event_id = e.id and r.user_id = me.u))
      order by e.starts_at)
      from me, public.events e
      where e.status = 'approved' and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
        and (me.aud = any (e.audience) or (me.mem and 'public' = any (e.audience)))
        and (not e.chapter_only or e.chapter_id = me.ch)), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(private.event_json(e) || jsonb_build_object(
        'registration', jsonb_build_object('id', r.id, 'status', r.status, 'amount_paise', r.amount_paise, 'attended_at', r.attended_at, 'created_at', r.created_at),
        'join_link', case when r.status in ('registered', 'attended') and e.status = 'approved' then e.join_link end,
        'certificate_ready', r.status = 'attended' and e.certificate and coalesce(e.ends_at, e.starts_at) < now())
      order by e.starts_at desc)
      from me, public.event_registrations r join public.events e on e.id = r.event_id
      where r.user_id = me.u and r.status <> 'pending_payment' and e.status <> 'removed'), '[]'::jsonb))
$$;

create or replace function private.event_register_check(e public.events, p_user uuid) returns text language sql stable security definer set search_path = '' as $$
  select case
    when e.id is null or e.status <> 'approved' then 'This event is not open for registration.'
    when e.starts_at <= now() then 'This event has already started.'
    when e.register_by is not null and e.register_by < now() then 'Registration has closed.'
    when e.capacity is not null and private.event_seats(e.id) >= e.capacity then 'This event is full.'
    when not (private.event_audience(p_user) = any (e.audience) or (private.is_member(p_user) and 'public' = any (e.audience))) then 'This event is not open to your membership type.'
    when e.chapter_only and e.chapter_id is distinct from (select p.chapter_id from public.profiles p where p.id = p_user) then 'This event is only for members of the hosting chapter.'
    when exists (select 1 from public.event_registrations r where r.event_id = e.id and r.user_id = p_user and r.status in ('registered', 'attended')) then 'You are already registered.'
  end
$$;

/** Free events register at once; paid events return the price, and the website then starts a Razorpay payment. */
create or replace function public.member_event_register(p_event uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); e public.events; why text; v_price int; v_id uuid;
begin
  if u is null then return private.err(null, 'Please sign in to register.'); end if;
  select * into e from public.events where id = p_event;
  why := private.event_register_check(e, u);
  if why is not null then return private.err(null, why); end if;
  v_price := case when private.is_member(u) then e.price_member_paise else e.price_public_paise end;
  if v_price > 0 then return jsonb_build_object('ok', true, 'need_payment', true, 'amount_paise', v_price); end if;
  insert into public.event_registrations (event_id, user_id, status, amount_paise, member_price)
  values (e.id, u, 'registered', 0, private.is_member(u))
  on conflict (event_id, user_id) do update set status = 'registered', amount_paise = 0, order_id = null, created_at = now()
  returning id into v_id;
  perform private.enqueue(u, 'event_registered', private.event_msg_vars(e, u), 'evreg:' || v_id);
  return jsonb_build_object('ok', true, 'registered', true, 'id', v_id);
end $$;

create or replace function private.event_msg_vars(e public.events, p_user uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('event', e.title, 'kind', private.event_kind_label(e.kind),
    'when', to_char(e.starts_at at time zone 'Asia/Kolkata', 'Dy, DD Mon YYYY, HH12:MI AM') || ' IST',
    'where', case e.mode when 'online' then 'Online. The joining link is in your GRAAS account, under Events.'
                         when 'hybrid' then 'Online, or at ' || coalesce(e.venue, 'the venue') || coalesce(', ' || e.city, '')
                         else coalesce(e.venue, 'The venue') || coalesce(', ' || e.city, '') end,
    'link', 'https://graas.org.in/account?tab=events')
$$;

create or replace function public.member_event_cancel(p_reg uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.event_registrations; e public.events;
begin
  select * into r from public.event_registrations where id = p_reg and user_id = (select auth.uid()) for update;
  if not found then return private.err(null, 'Registration not found.'); end if;
  select * into e from public.events where id = r.event_id;
  if r.status <> 'registered' or e.starts_at <= now() then return private.err(null, 'This registration cannot be cancelled now.'); end if;
  if r.amount_paise > 0 then return private.err(null, 'Paid tickets are cancelled by GRAAS under the refund policy. Write to us from Help.'); end if;
  update public.event_registrations set status = 'cancelled' where id = r.id;
  return jsonb_build_object('ok', true);
end $$;

/** Server: a ticket order. The amount always comes from the event and the buyer's membership. */
create or replace function public.svc_new_event_order(p_user uuid, p_event uuid, p_can_charge boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; why text; v_price int; v_reg uuid; v_id uuid; p public.profiles; v_mem boolean := private.is_member(p_user);
begin
  select * into e from public.events where id = p_event;
  why := private.event_register_check(e, p_user);
  if why is not null then return private.err(null, why); end if;
  v_price := case when v_mem then e.price_member_paise else e.price_public_paise end;
  if v_price <= 0 then return private.err(null, 'This event is free. Register without paying.'); end if;
  if not p_can_charge then return private.err(null, 'Online payment is not switched on yet. Please try again soon.'); end if;
  select * into p from public.profiles where id = p_user;
  update public.orders set status = 'cancelled' where user_id = p_user and event_id = e.id and status = 'created';
  insert into public.event_registrations (event_id, user_id, status, amount_paise, member_price)
  values (e.id, p_user, 'pending_payment', v_price, v_mem)
  on conflict (event_id, user_id) do update set status = 'pending_payment', amount_paise = v_price, member_price = v_mem, created_at = now()
  returning id into v_reg;
  insert into public.orders (user_id, membership_id, plan_id, plan_name, kind, payer_name, payer_email, payer_phone, base_paise, discount_paise,
    gst_percent, gst_paise, total_paise, coupon_code, term_years, term_discount_paise, term_label, event_id, registration_id)
  values (p_user, null, null, 'Event ticket: ' || left(e.title, 100), 'new', p.full_name, p.email, p.phone, v_price, 0, 0, 0, v_price, null, 1, 0, '1 year', e.id, v_reg)
  returning id into v_id;
  update public.event_registrations set order_id = v_id where id = v_reg;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'total_paise', v_price, 'event_id', e.id,
    'plan_name', 'GRAAS event: ' || left(e.title, 80), 'name', p.full_name, 'email', p.email, 'phone', p.phone);
end $$;

/** Server: the listing fee an expert pays to publish a session under the listing-fee model. */
create or replace function public.svc_new_listing_order(p_user uuid, p_event uuid, p_can_charge boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; v_id uuid; p public.profiles;
begin
  select * into e from public.events where id = p_event and host_user = p_user and host_type = 'expert';
  if not found or e.status <> 'awaiting_fee' or e.money_model <> 'listing_fee' then return private.err(null, 'There is no listing fee due for this session.'); end if;
  if e.listing_fee_paise <= 0 then return private.err(null, 'There is no listing fee due for this session.'); end if;
  if not p_can_charge then return private.err(null, 'Online payment is not switched on yet. Please try again soon.'); end if;
  select * into p from public.profiles where id = p_user;
  update public.orders set status = 'cancelled' where user_id = p_user and event_id = e.id and registration_id is null and status = 'created';
  insert into public.orders (user_id, membership_id, plan_id, plan_name, kind, payer_name, payer_email, payer_phone, base_paise, discount_paise,
    gst_percent, gst_paise, total_paise, coupon_code, term_years, term_discount_paise, term_label, event_id)
  values (p_user, null, null, 'Session listing fee: ' || left(e.title, 100), 'new', p.full_name, p.email, p.phone, e.listing_fee_paise, 0, 0, 0,
    e.listing_fee_paise, null, 1, 0, '1 year', e.id)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'total_paise', e.listing_fee_paise, 'event_id', e.id,
    'plan_name', 'GRAAS session listing fee', 'name', p.full_name, 'email', p.email, 'phone', p.phone);
end $$;

-- ---------- public website ----------

create or replace function public.public_events() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(private.event_json(e) order by e.starts_at), '[]'::jsonb)
  from public.events e where e.status in ('approved', 'completed') and e.starts_at > now() - interval '120 days'
$$;

create or replace function public.public_event(p_ref text) returns jsonb language sql stable security definer set search_path = '' as $$
  select private.event_json(e) from public.events e where e.ref = upper(trim(p_ref)) and e.status in ('approved', 'completed', 'cancelled')
$$;

-- ---------- staff ----------

create or replace function public.staff_events() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not private.is_staff(array['event_manager', 'finance']::public.staff_role[]) then '{}'::jsonb else jsonb_build_object(
    'events', coalesce((select jsonb_agg(private.event_json(e) || jsonb_build_object('join_link', e.join_link, 'staff_note', e.staff_note, 'host_user', e.host_user,
        'money', jsonb_build_object('model', e.money_model, 'fee_pct', e.platform_fee_pct, 'listing_fee_paise', e.listing_fee_paise, 'listing_paid', e.listing_paid_at is not null),
        'registered', (select count(*) from public.event_registrations r where r.event_id = e.id and r.status in ('registered', 'attended')),
        'attended', (select count(*) from public.event_registrations r where r.event_id = e.id and r.status = 'attended'),
        'gross_paise', (select coalesce(sum(o.total_paise - coalesce(o.refunded_paise, 0)), 0) from public.orders o where o.event_id = e.id and o.registration_id is not null and o.status in ('paid', 'refunded')),
        'payout', (select to_jsonb(po) from public.event_payouts po where po.event_id = e.id))
      order by (e.status = 'pending') desc, e.starts_at desc) from public.events e), '[]'::jsonb),
    'experts', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object('email', p.email, 'phone', p.phone,
        'sessions', (select count(*) from public.events e where e.host_user = x.user_id and e.host_type = 'expert'))
      order by (x.status = 'pending') desc, x.created_at desc) from public.experts x join public.profiles p on p.id = x.user_id), '[]'::jsonb)) end
$$;

create or replace function public.staff_event_action(p_id uuid, p_action text, p_note text default null, p_model text default null,
                                                     p_fee_pct numeric default null, p_listing_inr numeric default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.events; v text; n text := nullif(trim(coalesce(p_note, '')), ''); v_model text; host uuid;
begin
  if not private.is_staff(array['event_manager']::public.staff_role[]) then return private.err(null, 'Your role cannot do this.'); end if;
  select * into e from public.events where id = p_id for update;
  if not found then return private.err(null, 'Event not found.'); end if;
  host := coalesce(e.host_user, (select c.head_user from public.chapters c where c.id = e.chapter_id));
  if p_action = 'approve' then
    if e.status not in ('pending', 'rejected', 'paused', 'draft', 'awaiting_fee') then return private.err(null, 'This event cannot be approved now.'); end if;
    v_model := coalesce(p_model, e.money_model);
    if e.host_type = 'expert' and (e.price_member_paise > 0 or e.price_public_paise > 0 or v_model = 'listing_fee') and v_model not in ('ticket_share', 'listing_fee') then
      return private.err('model', 'Choose how GRAAS earns from this paid session: ticket share or listing fee.');
    end if;
    if v_model = 'listing_fee' and coalesce(p_listing_inr, e.listing_fee_paise / 100.0) <= 0 then return private.err('listing', 'Enter the listing fee.'); end if;
    update public.events set money_model = case when e.host_type = 'expert' then v_model else 'none' end,
      platform_fee_pct = coalesce(p_fee_pct, platform_fee_pct),
      listing_fee_paise = case when v_model = 'listing_fee' then round(coalesce(p_listing_inr, listing_fee_paise / 100.0) * 100)::int else 0 end,
      price_member_paise = case when v_model = 'listing_fee' then 0 else price_member_paise end,
      price_public_paise = case when v_model = 'listing_fee' then 0 else price_public_paise end,
      status = case when v_model = 'listing_fee' and e.listing_paid_at is null then 'awaiting_fee' else 'approved' end,
      staff_note = coalesce(n, staff_note), decided_by = (select auth.uid()), decided_at = now()
    where id = e.id returning status into v;
    if host is not null then
      perform private.enqueue(host, case when v = 'awaiting_fee' then 'event_fee_due' else 'event_approved' end,
        jsonb_build_object('event', e.title, 'ref', e.ref, 'fee', private.inr(round(coalesce(p_listing_inr, 0) * 100)::bigint),
          'link', case when e.host_type = 'chapter' then 'https://graas.org.in/chapter' when v = 'awaiting_fee' then 'https://graas.org.in/studio' else 'https://graas.org.in/events/' || lower(e.ref) end),
        'evok:' || e.id || ':' || v);
    end if;
  else
    v := case
      when p_action = 'reject' and e.status in ('pending', 'awaiting_fee', 'approved', 'paused') then 'rejected'
      when p_action = 'pause' and e.status = 'approved' then 'paused'
      when p_action = 'resume' and e.status = 'paused' then 'approved'
      when p_action = 'cancel' and e.status in ('approved', 'paused', 'awaiting_fee', 'pending') then 'cancelled'
      when p_action = 'complete' and e.status in ('approved', 'paused') then 'completed'
      when p_action = 'remove' and e.status <> 'removed' then 'removed'
      when p_action = 'restore' and e.status in ('removed', 'cancelled') then 'pending' end;
    if v is null then return private.err(null, 'This cannot be done now.'); end if;
    if p_action in ('reject', 'cancel') and n is null then return private.err('note', 'Add a short reason. It is sent to the host' || case when p_action = 'cancel' then ' and to everyone registered.' else '.' end); end if;
    update public.events set status = v, staff_note = coalesce(n, staff_note), decided_by = (select auth.uid()), decided_at = now() where id = e.id;
    if p_action = 'cancel' then
      perform private.enqueue(r.user_id, 'event_cancelled', private.event_msg_vars(e, r.user_id) || jsonb_build_object('reason', n,
                 'refund', case when r.amount_paise > 0 then 'Your ticket payment of ' || private.inr(r.amount_paise) || ' will be refunded to the same account.' else '' end),
               'evcan:' || r.id)
        from public.event_registrations r where r.event_id = e.id and r.status = 'registered';
      update public.orders set needs_review = true, review_note = 'Event cancelled (' || e.ref || '): refund this ticket.'
       where event_id = e.id and registration_id is not null and status = 'paid';
      update public.event_registrations set status = 'cancelled' where event_id = e.id and status in ('registered', 'pending_payment');
    end if;
    if host is not null and p_action in ('reject', 'cancel') then
      perform private.enqueue(host, 'event_rejected', jsonb_build_object('event', e.title, 'reason', n,
        'link', case when e.host_type = 'chapter' then 'https://graas.org.in/chapter' else 'https://graas.org.in/studio' end));
    end if;
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values ((select auth.uid()), 'event_' || p_action, 'events', e.id::text, jsonb_build_object('note', n, 'model', p_model, 'fee_pct', p_fee_pct, 'listing_inr', p_listing_inr));
  return jsonb_build_object('ok', true, 'status', v);
end $$;

create or replace function public.staff_expert_action(p_user uuid, p_action text, p_note text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare x public.experts; v text; n text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not private.is_staff(array['event_manager']::public.staff_role[]) then return private.err(null, 'Your role cannot do this.'); end if;
  select * into x from public.experts where user_id = p_user for update;
  if not found then return private.err(null, 'Expert not found.'); end if;
  v := case when p_action = 'approve' and x.status <> 'approved' then 'approved' when p_action = 'reject' and x.status in ('pending', 'approved', 'paused') then 'rejected'
            when p_action = 'pause' and x.status = 'approved' then 'paused' when p_action = 'resume' and x.status = 'paused' then 'approved' end;
  if v is null then return private.err(null, 'This cannot be done now.'); end if;
  if p_action = 'reject' and n is null then return private.err('note', 'Add a short reason for the applicant.'); end if;
  update public.experts set status = v, staff_note = coalesce(n, staff_note), decided_by = (select auth.uid()), decided_at = now() where user_id = x.user_id;
  if p_action in ('approve', 'reject') then
    perform private.enqueue(x.user_id, case when v = 'approved' then 'expert_approved' else 'expert_rejected' end,
      jsonb_build_object('reason', coalesce(n, ''), 'link', 'https://graas.org.in/studio'), 'expert:' || x.user_id || ':' || v);
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values ((select auth.uid()), 'expert_' || p_action, 'experts', x.user_id::text, jsonb_build_object('note', n));
  return jsonb_build_object('ok', true, 'status', v);
end $$;

/** Finance records the money paid to an expert for a ticket-share session (after the session). */
create or replace function public.staff_record_payout(p_event uuid, p_reference text, p_paid_on date) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; g int; f int;
begin
  if not private.is_staff(array['finance']::public.staff_role[]) then return private.err(null, 'Only finance can record payouts.'); end if;
  select * into e from public.events where id = p_event;
  if not found or e.host_type <> 'expert' or e.money_model <> 'ticket_share' then return private.err(null, 'Payouts are only for ticket-share expert sessions.'); end if;
  if coalesce(e.ends_at, e.starts_at) > now() then return private.err(null, 'Record the payout after the session.'); end if;
  if coalesce(trim(p_reference), '') = '' then return private.err('reference', 'Enter the bank or UPI reference of the payment.'); end if;
  select coalesce(sum(o.total_paise - coalesce(o.refunded_paise, 0)), 0) into g from public.orders o
   where o.event_id = e.id and o.registration_id is not null and o.status in ('paid', 'refunded');
  f := round(g * e.platform_fee_pct / 100.0)::int;
  insert into public.event_payouts (event_id, expert_user, gross_paise, fee_paise, net_paise, reference, paid_on, recorded_by)
  values (e.id, e.host_user, g, f, g - f, left(trim(p_reference), 120), coalesce(p_paid_on, private.today()), (select auth.uid()))
  on conflict (event_id) do nothing;
  if not found then return private.err(null, 'A payout is already recorded for this session.'); end if;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values ((select auth.uid()), 'payout_recorded', 'events', e.id::text, jsonb_build_object('net_paise', g - f));
  return jsonb_build_object('ok', true, 'net_paise', g - f);
end $$;

-- ---------- payments: tickets and listing fees settle like other orders ----------

create or replace function private.settle_order(p_order uuid, p_payment text, p_method text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare o public.orders; m public.memberships; pl public.membership_plans; r public.plan_change_requests; v_d date := private.today(); v_y int; v_fy text; v_n int;
  ev public.events;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Order not found.'); end if;
  if o.status in ('paid', 'refunded') then return jsonb_build_object('ok', true, 'already', true); end if;
  v_y := extract(year from v_d)::int - case when extract(month from v_d) < 4 then 1 else 0 end;
  v_fy := v_y::text || '-' || lpad(((v_y + 1) % 100)::text, 2, '0');
  update public.orders set status = 'paid', paid_at = now(), rzp_payment_id = coalesce(p_payment, rzp_payment_id), method = p_method, failure_reason = null,
    receipt_no = 'GRAAS/' || v_fy || '/' || lpad(nextval('private.receipt_no_seq')::text, 5, '0') where id = p_order;
  if o.coupon_code is not null then update public.coupons set used_count = used_count + 1 where code = o.coupon_code; end if;
  if o.event_id is not null then
    select * into ev from public.events where id = o.event_id;
    if o.registration_id is not null then
      update public.event_registrations set status = 'registered', order_id = o.id where id = o.registration_id and status in ('pending_payment', 'cancelled');
      get diagnostics v_n = row_count;
      if v_n = 0 then
        update public.orders set needs_review = true, review_note = 'Ticket payment received, but the registration was not waiting for it. Check, and refund if needed.' where id = p_order;
      else
        perform private.enqueue(o.user_id, 'event_registered', private.event_msg_vars(ev, o.user_id), 'evreg:' || o.registration_id);
      end if;
    else
      update public.events set listing_paid_at = now(), status = case when status = 'awaiting_fee' then 'approved' else status end where id = o.event_id;
      if ev.status <> 'awaiting_fee' then
        update public.orders set needs_review = true, review_note = 'Listing fee received, but the session was not waiting for it. Check, and refund if needed.' where id = p_order;
      end if;
    end if;
    return jsonb_build_object('ok', true, 'event_id', o.event_id);
  end if;
  if o.chapter_id is not null then
    update public.chapter_members set status = 'ready', seat = 'paid'
     where order_id = o.id and status = 'awaiting_payment';
    get diagnostics v_n = row_count;
    if v_n < coalesce(o.seats, 0) then
      update public.orders set needs_review = true,
        review_note = 'Chapter seat payment received for ' || o.seats || ' students, but only ' || v_n
                      || ' were still waiting. Check, and refund the difference if needed.' where id = p_order;
    end if;
    return jsonb_build_object('ok', true, 'chapter_id', o.chapter_id, 'seats', v_n);
  end if;
  select * into m from public.memberships where id = o.membership_id for update;
  if o.purpose = 'change' then
    select * into r from public.plan_change_requests where order_id = o.id and status = 'awaiting_payment' for update;
    if found and m.status = 'active' then
      perform private.apply_change(r.id);
    else
      update public.orders set needs_review = true,
        review_note = 'Payment for a type change received, but the change was no longer waiting. Check, and refund if needed.' where id = p_order;
    end if;
    return jsonb_build_object('ok', true);
  end if;
  select * into pl from public.membership_plans where id = o.plan_id;
  if found and m.id is not null and ((o.kind = 'new' and m.status = 'pending_payment') or (o.kind = 'renewal' and m.status = 'active')) then
    perform private.activate_membership(m.id, o.kind,
      case when pl.duration_months is null then null else pl.duration_months * greatest(o.term_years, 1) end);
  else
    update public.orders set needs_review = true,
      review_note = 'Payment received, but the membership was not waiting for it. Check, and refund if it is a duplicate.' where id = p_order;
  end if;
  return jsonb_build_object('ok', true);
end $function$;

create or replace function private.msg_order()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare v jsonb; p public.profiles; v_plan text;
begin
  v_plan := case when new.chapter_id is not null
                 then 'GRAAS chapter membership for ' || coalesce(new.seats, 0) || case when coalesce(new.seats, 0) = 1 then ' student' else ' students' end
                 when new.event_id is not null then coalesce(new.plan_name, 'GRAAS event')
                 else coalesce(new.plan_name || ' membership', 'GRAAS membership') || coalesce(', ' || nullif(new.term_label, '1 year'), '') end;
  v := jsonb_build_object(
    'amount', private.inr(new.total_paise),
    'plan', v_plan,
    'receipt_no', coalesce(new.receipt_no, ''),
    'paid_on', private.fmt_date((coalesce(new.paid_at, now()) at time zone 'Asia/Kolkata')::date),
    'reason', coalesce(nullif(trim(new.failure_reason), ''), 'The bank or payment app declined it.'),
    'link', case when new.chapter_id is not null then 'https://graas.org.in/chapter'
                 when new.event_id is not null and new.registration_id is null then 'https://graas.org.in/studio'
                 when new.event_id is not null then 'https://graas.org.in/account?tab=events'
                 else 'https://graas.org.in/account' end);
  select * into p from public.profiles where id = new.user_id;
  if new.status = 'paid' and old.status is distinct from 'paid' and new.total_paise > 0 then
    perform private.enqueue(new.user_id, 'payment_received', v, 'paid:' || new.id);
    perform private.enqueue_staff('staff_payment_received', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'applicant_email', coalesce(p.email, new.payer_email, ''),
      'kind', case when new.chapter_id is not null then 'chapter seats' when new.event_id is not null and new.registration_id is null then 'session listing fee'
                   when new.event_id is not null then 'event ticket' when new.purpose = 'change' then 'membership type change'
                   when new.kind = 'renewal' then 'renewal' else 'new membership' end));
  elsif new.status = 'failed' and old.status = 'created' then
    perform private.enqueue(new.user_id, 'payment_failed', v);
  end if;
  if new.needs_review and not coalesce(old.needs_review, false) then
    perform private.enqueue_staff('staff_payment_review', v || jsonb_build_object(
      'applicant', coalesce(p.full_name, new.payer_name, ''), 'note', coalesce(new.review_note, '')));
  end if;
  return null;
end $function$;

-- New kinds of login never pick up a staff invitation.
create or replace function private.handle_auth_user()
 returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update set email = excluded.email;
  if new.email_confirmed_at is not null
     and coalesce(new.raw_app_meta_data->>'via', '') not in ('member_signup', 'chapter_roster', 'chapter_head', 'expert_signup', 'admin_created', 'chapter_transfer') then
    insert into public.staff_members (user_id, role)
    select new.id, i.role from private.admin_invites i where lower(i.email) = lower(new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $function$;

create or replace function public.my_role() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'signed_in', (select auth.uid()) is not null,
    'staff', (select s.role from public.staff_members s where s.user_id = (select auth.uid()) and s.is_active),
    'member', exists (select 1 from public.memberships m where m.user_id = (select auth.uid())),
    'coordinator', exists (select 1 from public.chapters c where c.head_user = (select auth.uid()) and c.removed_at is null),
    'expert', (select x.status from public.experts x where x.user_id = (select auth.uid())),
    'name', (select p.full_name from public.profiles p where p.id = (select auth.uid())))
$$;

-- ---------- messages ----------
insert into public.message_templates (event, channel, audience, label, description, enabled, locked, subject, body, wa_name, wa_lang, wa_category, wa_params, sort) values
('event_registered', 'email', 'member', 'Event: registration confirmed', 'Sent when a member registers for an event (free) or their ticket payment is confirmed.', true, false,
 'You are registered: {{event}}',
 E'Hi {{name}},\n\nYou are registered for the {{kind}} **{{event}}**.\n\n**When:** {{when}}\n**Where:** {{where}}\n\nThe joining link and any updates are in your GRAAS account. After the event, your participation certificate appears there too.\n\n[Open my events]({{link}})',
 null, 'en', null, '{}', 90),
('event_cancelled', 'email', 'member', 'Event: cancelled', 'Sent to everyone registered when GRAAS cancels an event.', true, false,
 'Cancelled: {{event}}',
 E'Hi {{name}},\n\nWe are sorry: **{{event}}**, planned for {{when}}, is cancelled.\n\n**Reason:** {{reason}}\n\n{{refund}}\n\n[See other events]({{link}})',
 null, 'en', null, '{}', 91),
('event_approved', 'email', 'member', 'Event: approved', 'Sent to the expert or chapter coordinator when GRAAS publishes their event.', true, false,
 'Published: {{event}}',
 E'Hi {{name}},\n\n**{{event}}** ({{ref}}) is approved and members can now register.\n\nShare the event page with your network. After the event, mark attendance so attendees get their certificates.\n\n[See the event]({{link}})',
 null, 'en', null, '{}', 92),
('event_rejected', 'email', 'member', 'Event: sent back or cancelled', 'Sent to the expert or chapter coordinator when GRAAS sends back or cancels their event.', true, false,
 'About your event: {{event}}',
 E'Hi {{name}},\n\nThe GRAAS team could not go ahead with **{{event}}** as it is.\n\n**Note from GRAAS:** {{reason}}\n\n[Open your console]({{link}})',
 null, 'en', null, '{}', 93),
('event_fee_due', 'email', 'member', 'Expert session: listing fee due', 'Sent to an expert when GRAAS approves a session under the listing-fee model.', true, false,
 'Approved: pay the listing fee to publish {{event}}',
 E'Hi {{name}},\n\nGood news: **{{event}}** is approved. Under the listing-fee model, the session goes live as soon as the listing fee of **{{fee}}** is paid. Attendees then join free.\n\n[Pay and publish]({{link}})',
 null, 'en', null, '{}', 94),
('expert_approved', 'email', 'member', 'Expert approved', 'Sent when GRAAS approves an expert.', true, false,
 'Welcome, GRAAS expert',
 E'Hi {{name}},\n\nYou are now an approved GRAAS expert. You can create sessions, webinars, lectures and workshops from your Expert studio. GRAAS checks each session before it is published, and confirms how fees work for paid sessions.\n\n[Open the Expert studio]({{link}})',
 null, 'en', null, '{}', 95),
('expert_rejected', 'email', 'member', 'Expert application declined', 'Sent when GRAAS declines an expert application.', true, false,
 'About your GRAAS expert application',
 E'Hi {{name}},\n\nThank you for applying to host sessions on GRAAS. We cannot approve the application at this time.\n\n**Note from GRAAS:** {{reason}}\n\nYou can update your profile and apply again.\n\n[Open the Expert studio]({{link}})',
 null, 'en', null, '{}', 96),
('staff_event_new', 'email', 'staff', 'Staff: event to check', 'Sent to the staff alert address when an expert or chapter sends an event for approval.', true, false,
 'Event to check: {{title}}',
 E'Hi {{name}},\n\n**{{host}}** has sent a {{kind}} for approval: **{{title}}**, on {{when}}.\n\nCheck it in Admin, under Events. For paid expert sessions, choose ticket share or listing fee when you approve.\n\n[Open admin]({{link}})',
 null, 'en', null, '{}', 97),
('staff_expert_new', 'email', 'staff', 'Staff: expert to check', 'Sent to the staff alert address when someone applies to be an expert.', true, false,
 'Expert application: {{expert}}',
 E'Hi {{name}},\n\n**{{expert}}** ({{headline}}) has applied to host sessions on GRAAS.\n\nCheck the profile in Admin, under Events, Experts.\n\n[Open admin]({{link}})',
 null, 'en', null, '{}', 98)
on conflict do nothing;

-- ---------- grants ----------
revoke all on function private.is_member(uuid), private.event_audience(uuid), private.event_kind_label(text), private.event_seats(uuid),
  private.event_json(public.events), private.can_manage_event(public.events), private.event_register_check(public.events, uuid),
  private.event_msg_vars(public.events, uuid) from public, anon, authenticated;
revoke all on function public.svc_new_event_order(uuid, uuid, boolean), public.svc_new_listing_order(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.svc_new_event_order(uuid, uuid, boolean), public.svc_new_listing_order(uuid, uuid, boolean) to service_role;
grant execute on function public.expert_apply(jsonb), public.my_expert(), public.host_event_save(jsonb), public.host_event_action(uuid, text),
  public.chapter_events(), public.host_registrations(uuid), public.host_attendance(uuid, uuid[], boolean), public.member_events(),
  public.member_event_register(uuid), public.member_event_cancel(uuid), public.staff_events(),
  public.staff_event_action(uuid, text, text, text, numeric, numeric), public.staff_expert_action(uuid, text, text),
  public.staff_record_payout(uuid, text, date) to authenticated;
grant execute on function public.public_events(), public.public_event(text) to anon, authenticated;

-- (applied separately as `expert_signup`) Server only: an expert who is not a member creates a login and applies in one step.
-- See svc_expert_check(jsonb) and svc_expert_signup(uuid, jsonb) in the live database; both are callable only by the server.
