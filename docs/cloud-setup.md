# Turning on cloud sync

Fifteen minutes, once. You do the first four steps — creating accounts and
handling keys is yours, not something to hand to an assistant.

Until this is done the app carries on working exactly as before, storing
everything in the one browser. Nothing breaks while it is half-configured.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
   The free tier is far more than a family needs.
2. Pick the region closest to you — every read waits on that distance.
3. Save the database password somewhere safe. The app never uses it, but
   Supabase will ask for it if you ever need direct database access.

## 2. Create the tables

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and run it.
3. It should finish with no errors. Re-running it later is safe.

What it sets up: five tables, and row-level security so a signed-in account can
only ever see its own rows. Without that last part every family's records would
be readable by every other account, so it is not optional.

## 3. Turn on email sign-in

1. **Authentication → Providers → Email**: enabled.
2. Turn **Confirm email** on.
3. **Authentication → URL Configuration → Redirect URLs**, add both:
   - `http://localhost:5173`
   - `https://child-finance-manager-lvca.vercel.app`

   A sign-in link that comes back to an address not on this list is rejected.

Supabase's built-in mail is rate-limited and lands in spam more often than not.
It is fine for trying this out. If sign-in becomes a daily thing, connect your
own SMTP under **Authentication → Emails**.

## 4. Give the app its keys

**Project Settings → API**, copy the **Project URL** and the **anon public**
key.

The anon key is meant to be public — it ships inside the page either way, and
row-level security is what actually protects the data. The **service_role** key
on that same screen is the opposite: it bypasses every policy. Never put it in
this app, an env file, or a repository.

Locally, create `app/.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

That file is git-ignored.

On Vercel: **Project → Settings → Environment Variables**, add the same two
names and values, then redeploy so the build picks them up.

## 5. Sign in and bring your records across

1. Open the app. With the keys present, Settings offers **Sign in**.
2. Enter the family email address and follow the link that arrives.
3. The first time you sign in on a device that already holds records, the app
   offers to upload them. Do this **once**, on the device whose records you
   want to keep — Ian and Olivia live on whichever browser you have been using.
4. On every other device, sign in and take what the cloud has.

## What sync does and does not do

- Every device signed into the same account sees the same records, within a
  few seconds of a change.
- Offline, balances and history stay readable, and new entries queue. They
  upload when the connection returns.
- If the same entry is changed on two devices while one is offline, the more
  recent change wins. There is no merge dialog, and no history of what the
  other device had.
- Anyone who can read that email inbox can sign in. The inbox is the account.
