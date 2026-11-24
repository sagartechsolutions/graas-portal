# GRAAS portal

Public website and member platform for the Global Robotics And Automation Society.

- Next.js (App Router, TypeScript, Tailwind) deployed on Netlify (`graas-portal`)
- Supabase project `graas-portal` (Mumbai). Schema lives in `supabase/migrations`
- Environment variables are set in Netlify, never committed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`, `LEAD_TOKEN`, `IP_SALT`

Read the "GRAAS 2.0 Build Brief" in the GRAAS Claude project before changing anything.
