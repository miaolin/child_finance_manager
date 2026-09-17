# Pocket money

A browser app for keeping track of what each child has and what they spend.
Each child gets their own tin: money in, money out, and a balance that is
always the sum of the two.

Live at **https://child-finance-manager-lvca.vercel.app**. The link is public;
the app behind it is not. Signing in — with Google, or with an email and a
password — is the way in, and until someone does there are no tins, no history
and no settings to see.

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

## On a phone or a tablet

This is where the app is actually used, so that is what it is built for. Open
the link in Safari, then **Share → Add to Home Screen**. It gets the coin icon
and its own name, opens without browser bars, and opens with no connection —
the page keeps a copy of itself in the browser, the same way the records are
already kept there.

The layout follows the device rather than the other way round: one column of
tins on a phone, the history beside the balance on an iPad held sideways, and
nothing tucked under the notch or the home indicator in either orientation.

## Signing in, and the sync that comes with it

The account is the same thing as the front door: signing in is what opens the
app, and it is also what makes every device signed into that account show the
same records. The app keeps working offline either way — reads come from the
local copy, changes queue until there is a connection, and a device that is
already signed in opens with no connection at all, because the session is read
from the browser rather than from the network.

**Nothing works until it is set up.** With no keys configured there is no way
to sign in, and so no way in: the app says so on the sign-in screen instead of
opening. This is a change from earlier versions, which ran happily with no
account and kept everything in one browser.

### Setting it up

About twenty minutes, once. Steps 1 to 5 involve an account and keys, so they
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

**4. Turn on Google sign-in.** This is the tap most people will actually use;
the email and password stay underneath it as the way in when a Google round
trip goes wrong.

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials):
create a project, fill in the OAuth consent screen (**External**, your own
email as the contact, and add your own Google account under **Test users** —
an app in testing lets in nobody else, which is the door already closed), then
**Create credentials → OAuth client ID → Web application**.

Three addresses travel between the two consoles, and it is worth being clear
about which goes where, because they are easy to swap and the error when you
do says nothing useful.

- **Authorised redirect URIs**, on the Google client: the callback Supabase
  shows you under **Authentication → Sign In / Providers → Google**, ending in
  `/auth/v1/callback`. This one is Supabase's address, not the app's — Google
  hands the sign-in to Supabase, which then hands it back to the app.
- **Authorised JavaScript origins**, on the same Google client: where the app
  is served from. `http://localhost:5173` for running it yourself, and the
  deployed address once you have one.
- **Redirect URLs**, under Supabase's **Authentication → URL Configuration**:
  the same app addresses again. The app asks to be returned to whichever
  address it was opened from, and Supabase refuses any it was not told about
  — quietly, by sending the person to the **Site URL** instead. Add
  `http://localhost:5173/**` and the deployed address; a pattern such as
  `https://your-app-*.vercel.app/**` also catches preview builds.

Then paste the Google client's **Client ID** and **Client secret** into the
Supabase Google screen and switch the provider on.

The app checks whether the provider is on before offering the button, so if
you skip this step you get a line of explanation on the sign-in screen rather
than a Google button that leads nowhere.

While the Google consent screen is left in **Testing**, only the accounts
listed as test users can sign in at all. That is the door already closed, and
the seven-day limit Google puts on a testing app's refresh tokens does not
reach you here: the session the app keeps is Supabase's, not Google's, and
Google is only asked who you are once per sign-in.

The trade, for either way in, is that anyone who finds the project could
create an account on it. They would get their own empty account and could not
read yours — that is what row-level security is for — but once every device is
signed in you can close the door: **Authentication → Sign In / Providers →
Allow new users to sign up**, off.

**5. Copy the two keys.** **Project Settings → API** gives you the **Project
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

**6. Deploy.** Vercel needs a build that has both the sync code and the
variables, so redeploy after adding them.

Add the deployed address in the two places that only knew about localhost:
**Authorised JavaScript origins** on the Google client, and **Redirect URLs**
in Supabase. Miss the first and Google refuses the sign-in it allowed locally;
miss the second and signing in on the deployed app lands somewhere else.

**7. Sign in everywhere.** Start on the device holding the records you want to
keep — **Continue with Google**, or an email and password and **Create the
account**. Its records upload. On every other device, the same account, and
they arrive.

The order matters because the first device to sign in seeds the cloud.

Pick one way in and use it on every device. The records hang off the account,
not off the email address printed on it, so if Google and a password ever land
as two accounts, the second one opens an empty app rather than your records —
and the fix is to sign out and come back the way the first device did.

### What sync does and does not do

- A change on one device appears on the others by itself, usually within a
  second or two — nothing to press. Settings has a **Check now** button for
  when you want to force it.
- Offline, balances and history stay readable and new entries queue. Settings
  says how many changes are waiting.
- If the same entry is changed on two devices, the more recent change wins.
  There is no merge dialog and no record of what the other device had.
- Whoever holds the account holds the records: the Google account, or the
  inbox that can reset the password. That is what guards them, not the link.

## Where the data lives

Always in this browser, under one key in `localStorage` — that copy is what
every screen reads, which is why the app works with no connection.

That copy is kept in step with your Supabase project, so clearing the
browser's site data costs you nothing permanent: sign in again and the records
come back. Settings still has **Save a backup file** and **Load a backup
file** — a copy you hold yourself, answering to nobody's account, is worth
keeping either way.

Signing out leaves the records on the device and deletes nothing, but it does
close the app: the sign-in screen is what comes back.

## Deploying

Deployed on Vercel from `main`, with **Root Directory** set to `app`; the rest
is detected (`npm run build`, output `app/dist`). There is no client-side
routing, so no rewrite rule is needed. The build is a static bundle with no
server behind it, so any static host would serve it equally well.

The deployed URL is public and the app behind it is not: what anyone without
an account gets is the sign-in screen. Even past it, an account only ever sees
its own records — that is row-level security in the database, and it holds
whether or not anyone is stopped at the door. The door is what keeps the app
itself from opening to a stranger with the link.

There is no allowlist of permitted addresses. Anyone who can create an account
on the Supabase project gets their own empty app and cannot read yours. Once
every device of yours is signed in you can close that off as well:
**Authentication → Sign In / Providers → Allow new users to sign up**, off,
and, for Google, leaving the Google Cloud consent screen in testing with only
your own accounts as test users.

The parent PIN is a separate thing again: it guards the rules screen, not the
records, and not the deployment.

## How the pieces fit

Every screen talks to the `FinanceRepo` interface in `app/src/data/repo.ts` and
never to storage directly. That is what made cloud sync an addition rather than
a rewrite:

- `LocalRepo` — the browser copy, which every screen reads from.
- `SyncingRepo` — wraps `LocalRepo` when signed in. Reads still come from
  local; writes go local first and upload after.
- `sync/merge.ts` — decides which version of a row wins when two devices
  disagree. Pure, and tested on its own.

No screen changed when sync arrived, and none would change again if the cloud
behind it were swapped for something else.
