# Cross-device sync setup (Supabase)

Lumina works fully offline with no setup. To sync your library, progress, and PDF
files across devices, connect a free Supabase project. Takes ~10 minutes.

## 1. Create a project
1. Sign up at [supabase.com](https://supabase.com) and create a **new project** (free tier is fine).
2. Pick a strong database password (you won't need it for the app) and a region near you.

## 2. Create the tables + storage
1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of [`docs/supabase-schema.sql`](supabase-schema.sql) and click **Run**.
3. This creates the tables, row-level security, and the private `lumina-pdfs` storage bucket.

## 3. Turn on sign-in methods
Open **Authentication → Providers**.

- **Email** is enabled by default — that powers the magic-link sign-in. Nothing to do.
- **Google** (optional, for one-tap sign-in):
  1. Enable the **Google** provider.
  2. In [Google Cloud Console](https://console.cloud.google.com/) create an **OAuth 2.0 Client ID** (type: Web application).
  3. Under **Authorized redirect URIs**, add the callback Supabase shows you on the Google provider page (looks like `https://YOUR-REF.supabase.co/auth/v1/callback`).
  4. Paste the Google **Client ID** and **Client secret** back into Supabase and save.

Then open **Authentication → URL Configuration** and add your app URLs to **Redirect URLs**:
- `http://localhost:3000` and `http://localhost:3001` (local dev)
- your production URL, e.g. `https://your-app.vercel.app`

## 4. Get your keys
Open **Project Settings → API** and copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public** key → `VITE_SUPABASE_ANON_KEY`

(The anon key is designed to be public and safe to ship in the browser; row-level security protects the data.)

## 5. Wire it up

**Local:** copy `.env.example` to `.env.local` and fill in both values, then `npm run dev`.

**Vercel:** Project → **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, then redeploy.

That's it. A **Sign in to sync** button appears in the header. Sign in on any device and
your books, collections, streaks, notes, reading position, and the PDF files themselves
all follow you. With no keys set, Lumina simply runs in local-only mode.
