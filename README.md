# EUMTrade

Free trading journal. Next.js + Supabase.

## Setup
1. Create a free project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Project Settings > API: copy the URL and anon key into a new `.env.local` (see `.env.example`).
4. `npm install` then `npm run dev`, open http://localhost:3000
5. Deploy: push to GitHub, import the repo in Vercel, add the same two env vars.

Tip: in Supabase Authentication > Providers > Email, turn off "Confirm email" while testing.
