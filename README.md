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

Off until you set it up: see [docs/cloud-setup.md](docs/cloud-setup.md). With no
keys configured the app stores everything in one browser, which is a supported
way to use it.

Once it is on, every device signed into the same email shows the same records,
and the app keeps working offline — reads come from the local copy and changes
queue until there is a connection.

## Where the data lives

In this browser, on this device, under one key in `localStorage`. Nothing is
sent anywhere.

That means clearing the browser's site data erases it, and the data does not
follow you to another device or browser. Settings has **Save a backup file**,
which writes a JSON file holding everything, and **Load a backup file**, which
replaces what is on the device with that file.

There is no login. Anyone who can open this browser can see and change the
records.

## Deploying

Deployed on Vercel from `main`, with **Root Directory** set to `app`; the rest
is detected (`npm run build`, output `app/dist`). There is no client-side
routing, so no rewrite rule is needed. The build is a static bundle with no
server behind it, so any static host would serve it equally well.

Two things that deploying does not solve:

- **It does not give you sync.** Storage is per browser and per device, so the
  same deployed URL opened on three devices holds three unrelated sets of
  records. Sharing one family ledger needs the cloud swap below.
- **It does not add a login.** Anyone with the link can read and change the
  records. Put an auth gate in front of the deployment if that matters.

Records do not travel between origins either: to carry existing data from
`localhost` to the deployed site, use *Save a backup file* on one and *Load a
backup file* on the other.

## Moving to a cloud database later

Every screen talks to the `FinanceRepo` interface in `app/src/data/repo.ts` and
never to storage directly. Adding sync means:

1. Writing a second class against `FinanceRepo` (for example against Supabase).
2. Changing the one line in `app/src/App.tsx` that calls `createLocalRepo()`.
3. Exporting a backup file and importing it once, to carry existing records over.

No screen or component changes.
