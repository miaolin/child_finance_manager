# Pocket money

A browser app for keeping track of what each child has and what they spend.
Each child gets their own tin: money in, money out, and a balance that is
always the sum of the two.

Live at **https://child-finance-manager-lvca.vercel.app** — the link is public
and there is no login, so treat it as readable by anyone who has it.

Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Running it

The app lives in `app/`. Everything below runs from there.

```bash
cd app
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run build    # typecheck and produce app/dist/
npm test         # unit tests
npm run lint
```

## How it is put together

```
README.md          this file
task_plan.md       phases and decisions
findings.md        what was discovered and why things were chosen
progress.md        session log and test results
app/               the deployable web app
  src/
    domain/        the rules: money, balances, categories  (no React, no storage)
    data/          FinanceRepo interface + LocalRepo, its browser-storage version
    ui/            screens and components
```

Two rules hold throughout:

- **Money is an integer number of cents.** Decimals exist only in what a person
  reads or types. `parseAmountToCents` is the one door in.
- **A balance is never stored.** It is `sum(money in) − sum(money out)`,
  recomputed on every read, so editing or deleting history cannot leave a stale
  number behind.

## Cloud sync

Every device signed into the same email shows the same records, and the app
keeps working offline: reads come from the local copy, and changes queue until
there is a connection.

**It is off until you set it up.** With no keys configured the app stores
everything in one browser, which is a supported way to use it rather than a
broken state.

### Setting it up

About fifteen minutes, once. Steps 1 to 4 involve an account and keys, so they
are yours to run.

**1. Create the project.** Sign up at [supabase.com](https://supabase.com) and
create one. The free tier is far more than a family needs. Pick the region
nearest you — every read waits on that distance. Keep the database password
somewhere safe; the app never uses it, but Supabase asks for it if you ever
want direct database access.

**2. Create the tables.** Dashboard → **SQL Editor**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), run it. Re-running it later is
safe.

That file also switches on row-level security, which is the entire security
model: it is what stops one signed-in account reading another family's records.

**3. Turn on email sign-in.** **Authentication → Providers → Email**, enabled.
Turn **Confirm email off**.

Sign-in is an email address and a password, not a link. That is deliberate: a
sign-in link has to be opened in the browser that asked for it, and a mail app
will hand it to whichever browser is the default — which signs in the wrong
browser and leaves the records stranded on the right one. A password works
wherever it is typed. Leaving confirmation on would put a link back in the way
of creating the account.

The trade is that anyone who finds the project could create an account on it.
They would get their own empty account and could not read yours — that is what
row-level security is for — but once every device is signed in you can close
the door: **Authentication → Sign In / Providers → Allow new users to sign up**,
off.

**4. Copy the two keys.** **Project Settings → API** gives you the **Project
URL** and the **anon public** key. Put them in `app/.env.local`, which is
git-ignored:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Add the same two to **Vercel → Settings → Environment Variables**.

> The **`service_role`** key sits beside the anon key on that same screen. It
> bypasses every security policy — it must never go in this app, an env file,
> or the repository. The anon key is meant to be public; row-level security is
> what actually protects the data.

**5. Deploy.** Vercel needs a build that has both the sync code and the
variables, so redeploy after adding them.

**6. Create the account, then sign in everywhere.** Start on the device
holding the records you want to keep: Settings → email and password → **Create
the account**. Its records upload. On every other device, the same email and
password → **Sign in**, and they arrive.

The order matters because the first device to sign in seeds the cloud.

### What sync does and does not do

- A change on one device appears on the others by itself, usually within a
  second or two — nothing to press. Settings has a **Check now** button for
  when you want to force it.
- Offline, balances and history stay readable and new entries queue. Settings
  says how many changes are waiting.
- If the same entry is changed on two devices, the more recent change wins.
  There is no merge dialog and no record of what the other device had.
- Anyone who can read that email inbox can sign in. The inbox is the account.

## Where the data lives

Always in this browser, under one key in `localStorage` — that copy is what
every screen reads, which is why the app works with no connection.

**Signed in**, that copy is kept in step with your Supabase project, and
clearing the browser's site data costs you nothing permanent: sign in again and
the records come back.

**Not signed in**, the browser is the only copy. Clearing its site data erases
the records, and they do not follow you to another device. Settings has **Save
a backup file** and **Load a backup file**, which is how records move between
browsers without the cloud — and a backup is worth keeping either way.

Signing out leaves the records on the device. It deletes nothing.

## Deploying

Deployed on Vercel from `main`, with **Root Directory** set to `app`; the rest
is detected (`npm run build`, output `app/dist`). There is no client-side
routing, so no rewrite rule is needed. The build is a static bundle with no
server behind it, so any static host would serve it equally well.

The deployed URL is public, and the app itself has no front door: anyone with
the link can open it. What they see depends on sync. Signed out, they get an
empty app with their own browser's records — not yours. Your records reach a
device only when someone signs into your email, so the inbox is what actually
guards them.

The parent PIN is a separate thing again: it guards the rules screen, not the
records, and not the deployment.

## How the pieces fit

Every screen talks to the `FinanceRepo` interface in `app/src/data/repo.ts` and
never to storage directly. That is what made cloud sync an addition rather than
a rewrite:

- `LocalRepo` — the browser copy, and the whole app when signed out.
- `SyncingRepo` — wraps `LocalRepo` when signed in. Reads still come from
  local; writes go local first and upload after.
- `sync/merge.ts` — decides which version of a row wins when two devices
  disagree. Pure, and tested on its own.

No screen changed when sync arrived, and none would change again if the cloud
behind it were swapped for something else.
