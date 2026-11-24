# Build notes: membership go-live (started 24 Nov 2026, evening)

Asked by Sagar: policies and rules, membership live, Razorpay in admin, full member and admin functions,
livelier home page, layout that uses wide screens.

Plan and order of work:
1. DB migrations: `membership_tables` (0003), `membership_functions` (0004). Edge functions: `portal`, `razorpay-webhook`.
2. Member side: `/join`, `/signin`, `/account`, `/verify`.
3. Admin: sidebar shell; Dashboard, Members, Payments (+refunds), Coupons, Payment gateway, Policies, Helpdesk, Staff, Activity.
4. Public: policies pages (defaults in `src/lib/policy-defaults.ts`, DB rows override), home page sections, fluid layout.
5. Test, deploy, push, update the project brief.

Decisions taken (flag to Sagar):
- Sign-up is email + password with no email verification (no email sender yet). Accounts are created by the `portal` edge function.
- Razorpay keys are typed by Sagar in Admin, Payment gateway. Secrets live in `private.app_secrets`, never in the repo.
- Individuals are active on confirmed payment; institutions and industry are verified by staff first.
- Fee null = "Fee to be announced" (account and application allowed, payment not). Fee 0 = active without payment.
- Refund default: non-refundable once active, except duplicate payment, non-activation, or rejection.
