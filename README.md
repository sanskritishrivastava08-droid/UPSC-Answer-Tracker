# UPSC Mains Answer Tracker — Setup

Plain HTML/CSS/JS, backed by Supabase Auth + Postgres. Takes about 5 minutes to connect to your own Supabase project.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (the free tier is enough).
2. Wait for it to finish provisioning.

## 2. Create the database table

1. In your project, open the **SQL Editor**.
2. Paste in the contents of `schema.sql` (included in this folder) and run it.
   - This creates a `progress` table with one row per user, storing all 14 subject counts as JSON.
   - It also enables **Row Level Security** with policies so a user can only ever read or write their own row.

## 3. Turn on email/password auth

1. Go to **Authentication → Providers**.
2. Make sure **Email** is enabled (it is by default).
3. Optional: under **Authentication → Settings**, you can turn off "Confirm email" during testing so new accounts can sign in immediately.

## 4. Connect the app to your project

1. Go to **Settings → API** in Supabase.
2. Copy the **Project URL** and the **anon public** key.
3. Open `config.js` in this folder and paste them in:

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

## 5. Run it

Any static file server works. From this folder:

```bash
npx serve .
```

or just open `index.html` directly in a browser (some browsers restrict local scripts — a local server is more reliable).

## How it works

- **Sign up / sign in** uses `supabase.auth`. No passwords or tokens are handled by this app directly.
- On login, the app fetches your `progress` row (creating one with all zeros if it's your first time).
- Every `+` / `−` click updates the on-screen count immediately, then saves the full counts object back to your `progress` row.
- The **Total Answers** number is always calculated live as the sum of all 14 subjects — it isn't stored separately.
- **Reset Progress** asks for confirmation, then sets every subject back to 0 and saves.
- Row Level Security means even if someone had your anon key, they could never read or write another user's row — only their own, authenticated `auth.uid()` row.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure — auth screen + dashboard |
| `styles.css` | Dark theme, responsive grid |
| `config.js` | Your Supabase project URL + anon key |
| `app.js` | Auth flow, data loading/saving, counter logic |
| `schema.sql` | Table + Row Level Security policies |
