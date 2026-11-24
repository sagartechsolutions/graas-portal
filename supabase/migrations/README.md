# Database migrations

Applied to the `graas-portal` Supabase project, in order:

| Name | In this folder | What it adds |
| --- | --- | --- |
| `foundation` | `0001_foundation.sql` | profiles, staff, plans, settings, leads, audit log |
| `updates_gallery` | `0002_updates_gallery.sql` | posts, gallery items, `media` bucket |
| `membership_tables` | recorded in Supabase | memberships, orders, payment events, refunds, coupons, policies, tickets, access rules |
| `membership_functions` | recorded in Supabase | quotes, sign-up, activation, payments, refunds, gateway keys, staff actions, dashboard |

The last two were applied through the Supabase connector on 24 Nov 2026. Their full SQL is stored in the project's
migration history (`supabase_migrations.schema_migrations`). To copy them into this folder, run
`supabase migration fetch` with the Supabase CLI linked to the project.

Edge functions live in `supabase/functions`: `portal` (accounts, Razorpay orders and refunds, staff account tools)
and `razorpay-webhook`. Both are deployed with JWT checking off because each does its own checks.
