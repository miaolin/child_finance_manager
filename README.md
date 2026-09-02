# Pocket money

A browser app for keeping track of what each child has and what they spend.
Each child gets their own tin: money in, money out, and a balance that is
always the sum of the two.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run build    # typecheck and produce dist/
npm test         # unit tests
npm run lint
```

## How it is put together

```
src/
  domain/     the rules: money, balances, categories  (no React, no storage)
  data/       FinanceRepo interface + LocalRepo, its browser-storage version
  ui/         screens and components
```

Two rules hold throughout:

- **Money is an integer number of cents.** Decimals exist only in what a person
  reads or types. `parseAmountToCents` is the one door in.
- **A balance is never stored.** It is `sum(money in) − sum(money out)`,
  recomputed on every read, so editing or deleting history cannot leave a stale
  number behind.

## Where the data lives

In this browser, on this device, under one key in `localStorage`. Nothing is
sent anywhere.

That means clearing the browser's site data erases it, and the data does not
follow you to another device or browser. Settings has **Save a backup file**,
which writes a JSON file holding everything, and **Load a backup file**, which
replaces what is on the device with that file.

There is no login. Anyone who can open this browser can see and change the
records.

## Moving to a cloud database later

Every screen talks to the `FinanceRepo` interface in `src/data/repo.ts` and
never to storage directly. Adding sync means:

1. Writing a second class against `FinanceRepo` (for example against Supabase).
2. Changing the one line in `src/App.tsx` that calls `createLocalRepo()`.
3. Exporting a backup file and importing it once, to carry existing records over.

No screen or component changes.
