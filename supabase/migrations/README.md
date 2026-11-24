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

The last two were applied through the Supabase connector on 24 Nov 2026. Their full SQL is stored in the project's
migration history (`supabase_migrations.schema_migrations`). To copy them into this folder, run
`supabase migration fetch` with the Supabase CLI linked to the project.

Edge functions live in `supabase/functions`: `portal` (accounts, codes, password reset, Razorpay orders and refunds,
staff account tools, message tests, Meta template sync), `razorpay-webhook`, and `notify` (sends queued messages; called
by the database through pg_net and every two minutes by pg_cron, with a key kept in `private.app_secrets`). `portal` and
`notify` import `_shared/messaging.ts` (Brevo email and Meta WhatsApp). All are deployed with JWT checking off because
each does its own checks.
