-- GRAAS portal · updates (news posts) and gallery, with a public media bucket for staff uploads.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text,
  body text,
  category text not null default 'Announcement',
  cover_url text,
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.posts enable row level security;
create index posts_published_idx on public.posts (published_at desc) where is_published;
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
create trigger posts_audit after insert or update or delete on public.posts for each row execute function private.audit_row();
create policy posts_select on public.posts for select to anon, authenticated
  using ((is_published and published_at <= now()) or private.is_staff());
create policy posts_insert on public.posts for insert to authenticated
  with check (private.is_staff(array['communications']::public.staff_role[]));
create policy posts_update on public.posts for update to authenticated
  using (private.is_staff(array['communications']::public.staff_role[]))
  with check (private.is_staff(array['communications']::public.staff_role[]));
create policy posts_delete on public.posts for delete to authenticated
  using (private.is_staff(array['communications']::public.staff_role[]));

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  credit text,
  width int,
  height int,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.gallery_items enable row level security;
create index gallery_order_idx on public.gallery_items (sort_order, created_at desc);
create trigger gallery_audit after insert or update or delete on public.gallery_items for each row execute function private.audit_row();
create policy gallery_select on public.gallery_items for select to anon, authenticated
  using (is_published or private.is_staff());
create policy gallery_insert on public.gallery_items for insert to authenticated
  with check (private.is_staff(array['communications']::public.staff_role[]));
create policy gallery_update on public.gallery_items for update to authenticated
  using (private.is_staff(array['communications']::public.staff_role[]))
  with check (private.is_staff(array['communications']::public.staff_role[]));
create policy gallery_delete on public.gallery_items for delete to authenticated
  using (private.is_staff(array['communications']::public.staff_role[]));

-- Public bucket for photos uploaded by staff. Anyone can view a file by its link; only staff can add or remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy media_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and private.is_staff(array['communications']::public.staff_role[]));
create policy media_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and private.is_staff(array['communications']::public.staff_role[]));
create policy media_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and private.is_staff(array['communications']::public.staff_role[]))
  with check (bucket_id = 'media' and private.is_staff(array['communications']::public.staff_role[]));
create policy media_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and private.is_staff(array['communications']::public.staff_role[]));

insert into public.posts (slug, title, summary, body, category, cover_url, is_published) values
  ('membership-pre-registration-open', 'Pre-registration for GRAAS membership is open',
   'Reserve your place before membership opens. It takes a minute and you receive a pre-registration number.',
   E'Membership of the Global Robotics And Automation Society opens soon for students, professionals, institutions and industry.\n\nPre-register on this website to be told the day it opens. You will receive a pre-registration number and an invite link you can share with classmates and colleagues.\n\nMembership fees will be published on the Membership page before applications open.',
   'Membership', '/photos/hero', true),
  ('a-new-home-for-graas', 'A new home for GRAAS',
   'GRAAS has a new website, built around what members can do: learn, build, compete and work with industry.',
   E'This is the new GRAAS website. It replaces the earlier portal and starts fresh.\n\nOver the coming weeks it will add member accounts with a verified digital ID, college and school chapters, an events calendar, live lectures and courses, and a board where companies post jobs and automation problems.\n\nEach part is announced here as it opens.',
   'Announcement', '/photos/chip', true),
  ('graascon-2027-planned', 'GRAASCON 2027: dates to be announced',
   'The first GRAAS conference on robotics and automation is planned for 2027. Dates, venue and the call for papers will be published here.',
   E'GRAASCON is the conference of the Global Robotics And Automation Society, bringing research papers, industry demonstrations and student projects together.\n\nThe first edition is planned for 2027. Dates, venue, tracks and the call for papers will be announced on this page and on the GRAASCON page.',
   'Conference', '/photos/assembly', true);

insert into public.gallery_items (image_url, caption, credit, width, height, sort_order) values
  ('/photos/industry', 'Robot arms on an automated production line', 'Unsplash', 1800, 1200, 10),
  ('/photos/hero', 'A six-axis industrial arm in a showroom', 'Unsplash', 1800, 1192, 20),
  ('/photos/compete', 'A competition robot on the field mat', 'Unsplash', 1800, 2400, 30),
  ('/photos/chip', 'Placing a microchip on a circuit board', 'Unsplash', 1800, 1352, 40),
  ('/photos/assembly', 'Robotic arms assembling a car chassis', 'Unsplash', 1800, 909, 50),
  ('/photos/rovers', 'Small wheeled robots built from kits', 'Unsplash', 1800, 1200, 60),
  ('/photos/chess', 'A robot arm playing chess', 'Unsplash', 1800, 1350, 70),
  ('/photos/printers', '3D printers producing parts', 'Unsplash', 1800, 1199, 80),
  ('/photos/bluearm', 'An industrial arm working inside a factory cell', 'Unsplash', 1800, 1129, 90),
  ('/photos/arduino', 'A microcontroller board, where most projects begin', 'Unsplash', 1800, 1013, 100),
  ('/photos/panel', 'A touchscreen control panel on a production machine', 'Unsplash', 1800, 1201, 110),
  ('/photos/drone', 'A quadcopter in flight', 'Unsplash', 1800, 1200, 120),
  ('/photos/prototype', 'A robot prototype on show', 'Unsplash', 1800, 2700, 130),
  ('/photos/hand', 'Close-up of a robot hand', 'Unsplash', 1800, 1296, 140);
