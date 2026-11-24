# Comped

Local restaurants and small businesses comp a meal. Creators visit, post, and get approved.

- **Creators:** browse open comps, book a visit time, show a 6-character code at the table, then submit their post link.
- **Businesses:** post offers (comp amount, what to post, follower minimum, spots, visit days), redeem codes at the table with the bill amount, and approve or send back posts.

Stack: React + Vite (mobile-first web app, installable to the home screen) on Supabase (Postgres, auth, row-level security).

## Database

Your Supabase project is **comped** (`defpepvvmnjzyblpspya`) and the schema is already live. `supabase/migrations/0001_core_schema.sql` is a copy for reference.

The security rules live in the database:
- Creators only see their own visits. Businesses only see visits to their own business.
- Claiming, cancelling, redeeming, submitting and reviewing all go through database functions. These enforce spot limits, follower minimums, one claim per creator per offer, and single-use codes.
- Nobody can switch between creator and business after sign-up.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The `.env` file already points at your project. The publishable key is safe to ship in a browser app.

## Deploy to Vercel (about 5 minutes)

1. Push this folder to a new GitHub repo.
2. In Vercel, go to **Add New → Project**, import the repo, and keep the Vite defaults.
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the values from `.env`.
4. Deploy. `vercel.json` already handles page refreshes on deep links.
5. In Supabase, go to **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel URL, e.g. `https://comped.vercel.app`.
   - Add the same URL under **Redirect URLs**.

   This makes the sign-up confirmation emails link back to the live app.

## Before inviting real users

- **Emails:** Supabase's built-in email sender only allows a few emails per hour. Before launch, add your own SMTP under **Authentication → Emails → SMTP Settings**. Resend's free tier works.
- **Follower counts are self-reported.** Check a creator's profile before approving their first visit, or add an Instagram API check later.
- **No payments.** The comp happens at the restaurant's register: staff enters the bill, and the app records how much was covered.

## Ideas for v2 (good first tasks in Claude Code)

- Photos for businesses (Supabase Storage)
- Push or SMS reminders before visits and post deadlines
- Automatic post verification through the Instagram API mentions endpoint
- Mark overdue posts as `expired` with a scheduled function
- Admin view for you to approve new creators and businesses
