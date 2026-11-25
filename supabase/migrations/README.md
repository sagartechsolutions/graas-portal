# Database migrations

Applied to the `graas-portal` Supabase project, in order:

| Name | In this folder | What it adds |
| --- | --- | --- |
| `foundation` | `0001_foundation.sql` | profiles, staff, plans, settings, leads, audit log |
| `updates_gallery` | `0002_updates_gallery.sql` | posts, gallery items, `media` bucket |
| `membership_tables` | recorded in Supabase | memberships, orders, payment events, refunds, coupons, policies, tickets, access rules |
| `membership_functions` | recorded in Supabase | quotes, sign-up, activation, payments, refunds, gateway keys, staff actions, dashboard |
| `messaging` | `0005_messaging.sql` | message queue, one-time codes, verification flags, event triggers, daily reminders (pg_cron), instant sending (pg_net), message settings and broadcast |
| `message_templates` and `messaging_channels` | `0006_message_templates.sql` | the wording of every email and WhatsApp message; which code channels work |
| `messaging_fee_not_announced` | `0007_…` (note) | "fee coming soon" messages, "payment open" when a fee is first set, plan names in messages |
| `security_pin` | `0008_security_pin.sql` (note) | 6-digit PIN for changing payment and messaging keys |
| `membership_terms`, `order_term_label` | `0009_membership_terms.sql` (note) | 1, 3, 5 year and lifetime (10 year) memberships with their own discounts |
| `member_details_and_photos` | `0010_member_details_and_photos.sql` | gender, course, branch, year; parent or guardian for under-18s (no age bar); dropdown lists in `site_settings.profile_options`; private `member-photos` bucket |
| `membership_type_change` | `0011_membership_type_change.sql` | change requests after payment, staff approval with a fee difference, `change` orders, messages |
| `fix_profile_save_status_list` | (note) | 25 Nov: profile save no longer names a status (`expired`) that does not exist, which had made every save fail |
| `school_students_and_series` | `0012_school_students_and_series.sql` | typed text for "Other" course or branch; free School Student plan (only through a school chapter); member number series per plan (`GRAAS-STU-26-00001`, `SCH`, `PRO`, `INS`, `IND`) |
| `chapters` | `0013_chapters.sql` | college chapters (branch-wise, 15 free seats, at least 10 students, principal's letter) and school chapters; private `chapter-docs` bucket; coordinator and staff functions; public chapter list |
| `chapter_payments_logins_messages` | `0014_chapter_payments_logins_messages.sql` | chapter seat orders, automatic student logins (claimed and set up by `notify` and `portal`), quiet set-up, chapter emails, chapters in my_account, verify and the dashboard |
| `pledge_profiles_roles`, `opportunities`, `events_sessions`, `expert_sessions_choose_model`, `expert_signup`, `admin_controls` | `0016` to `0019` | pledge and career profiles, opportunities, events and experts, admin controls (25 Nov) |
| `whatsapp_inbox_and_reminders_1`, `_2`, `_3` | recorded in Supabase | 25 Nov afternoon: WhatsApp inbox (`wa_threads`, `wa_messages`), delivery and read status, Meta app secret and verify token, automatic reply, event reminders by email and WhatsApp, WhatsApp rows for event and opportunity messages. The session that wrote them lost its copy of the code; the admin screens were rebuilt from the live site on 26 Nov. The `whatsapp-webhook` and `whatsapp-admin` functions (version 1) are deployed but their source is not in this folder yet: copy it with the Supabase connector's get_edge_function. |
| `public_profiles_documents` | `0021_public_profiles_documents.sql` | 26 Nov: public profile switch, resume settings, cover, view count; QR page data (`member_public`); member documents (resume, certificates) in the private `member-docs` bucket with GRAAS verification; school students cannot apply to host |

Rows marked "recorded in Supabase" or "(note)" were applied through the Supabase connector (24 and 25 Nov 2026). Their full SQL is stored in the project's
migration history (`supabase_migrations.schema_migrations`). To copy them into this folder, run
`supabase migration fetch` with the Supabase CLI linked to the project.

Edge functions live in `supabase/functions`: `portal` (accounts, codes, password reset, Razorpay orders and refunds,
staff account tools, message tests, Meta template sync), `razorpay-webhook`, and `notify` (sends queued messages; called
by the database through pg_net and every two minutes by pg_cron, with a key kept in `private.app_secrets`; it also sets up
logins for approved chapter students). `portal` and `notify` import `_shared/messaging.ts` (Brevo email and Meta WhatsApp)
and `_shared/provision.ts` (chapter student logins). All are deployed with JWT checking off because
each does its own checks.
