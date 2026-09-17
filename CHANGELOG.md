# Changelog

Notable changes to Pocket money. Newest first.

Versions follow [semantic versioning](https://semver.org): the first number
changes when the way the app is used changes, the second when something is
added, the third for fixes.

## 4.0.0 — 2026-09-17

The app had no front door: the deployed link opened straight into it, and
signing in was an optional extra that only switched on sync. Now signing in is
how you get in at all.

### Added

- **Continue with Google.** One tap, no password to lose, and the account
  chooser every time so a shared device does not sign the last person back in.
  The button only appears when the Supabase project actually offers Google —
  otherwise the screen says so, rather than sending you to a page of JSON.
- **A sign-in screen** in front of everything. No tins, no history, no
  settings until someone is through it.

### Changed

- **The app requires a cloud project.** With no keys configured there is now
  no way to sign in and so no way in, where before the app ran happily on one
  browser with no account at all. Anyone who used it that way should save a
  backup file first, set the project up, and load the file back in once signed
  in.
- Signing in and out moved: in at the front door, out from Settings, which now
  only describes the account and what sync is doing.
- The sign-in round trip carries a one-use code rather than the session
  itself, so the access token no longer passes through the address bar and
  into browser history.
- A device that is already signed in still opens with no connection — the
  session is read from the browser, not fetched.

## 3.2.0 — 2026-09-14

The app is used on an iPhone or an iPad nearly all of the time, so it is now
built for that first and for a desktop browser second.

### Added

- **Add it to the home screen** and it opens as its own app: no browser bars,
  its own coin icon, its own name. It also opens with no connection at all —
  the page keeps a copy of itself, which is what the records already did.
- **The history sits beside the balance on an iPad** held sideways, instead of
  a scroll below it.

### Changed

- The page runs edge to edge under the notch and the home indicator, with the
  gutters to keep every figure and button clear of them, in both orientations.
- The bar with **All tins** and **Settings** stays at the top of the screen
  rather than scrolling away above a long history.
- Every button and field is at least 44px tall — the smallest target a finger
  hits reliably.
- Sheets use the height that is actually visible, so the on-screen keyboard no
  longer covers the Save button, and the tins no longer scroll away behind an
  open sheet. On a phone held sideways a sheet takes the whole screen.
- A chore's name is no longer squeezed into a sliver by the price beside it: on
  a phone the price and the button move to a second line.
- Tapping no longer flashes a grey box, selects the label, or waits to see
  whether a second tap is coming; focusing a field no longer zooms the page in
  and leaves it there.

## 3.1.0 — 2026-09-02

Sync worked in tests but had never once carried data between two real devices.
This is the fix for why.

### Changed

- **Sign in with an email and a password**, not a link. A sign-in link has to be
  opened in the browser that asked for it, and a mail app hands it to whichever
  browser is the default — so the wrong browser gets signed in and the records
  stay stranded on the right one. That failed four times in a row on a real
  setup. A password works wherever it is typed.
- **Changes now appear on other devices by themselves**, usually within a second
  or two. "Sync now" became "Check now" and is only there for when you want to
  force it.

### Added

- Sign-in errors say what to do — "use Create the account instead" rather than
  "invalid login credentials".

### Notes

- Setup changed: email confirmation should be **off**, and the tables must be
  added to the realtime publication. Re-run `supabase/schema.sql`; it is safe
  to run again and only adds what is missing.
- An account made under the old link-based sign-in has no password. The
  simplest fix is to delete that user in the Supabase dashboard and create a
  fresh account from the app.

## 3.0.0 — 2026-09-02

The same records on every device, and an app that still works without a signal.

Cloud sync is **off until you set it up** — see
the setup steps in [README.md](README.md#cloud-sync). With no keys the app
behaves exactly as it did before, storing everything in one browser. That is a
supported way to use it, not a broken state.

### Added

- **Sync across devices.** Sign in with an email link on each device and they
  all show the same children, entries and rules.
- **Works offline.** Balances and history stay readable with no connection, and
  new entries queue. Settings says how many changes are waiting to upload.
- **Sign-in by link**, so there is no password to store or type on a child's
  device. Signing out leaves the records on the device; it deletes nothing.

### Changed

- Every record now carries when it last changed, and deleting one leaves a
  tombstone instead of dropping it. Without that, a delete on one device would
  be undone by the next sync from another that had not heard about it.

### Notes

- When the same entry is changed on two devices, the more recent change wins.
  There is no merge dialog, and no record of what the other device had.
- Anyone who can read the family email inbox can sign in. The inbox is the
  account.
- The cloud round trip has not been verified against a live project yet — that
  needs a Supabase project, which only the account holder can create.

## 2.0.0 — 2026-09-02

The parent sets the rules; the child records what happened within them. There
is deliberately no approval queue — entries count toward the balance the moment
they are recorded.

### Added

- **Parent view**, behind a 4-digit PIN, with four sections: ways to earn, ways
  to spend, chores, and each child's allowance and limits.
- **Editable categories.** What a child can say money came from, or went on, is
  now something the parent changes in the app rather than something set in the
  code. Removing a category hides it from the children but keeps its name on
  entries already recorded against it.
- **Chores** — jobs with a fixed price. A child claims one in a tap, so the
  amount cannot be mistyped.
- **Allowance**, weekly or monthly, credited without anyone doing anything.
  Opening the app twice in a day credits once; an app left closed for a month
  credits every week it missed rather than only the latest; starting an
  allowance today does not back-pay.
- **Spending limits** — a cap per purchase and a cap per week (Monday to
  Sunday). A blocked spend says which limit it hit and by how much, rather than
  only refusing.
- **Forgotten the PIN?** on the gate clears the PIN so a new one can be chosen,
  leaving every child, entry and rule untouched.

### Changed

- Categories moved out of the code and into stored data. Existing devices and
  older backup files are migrated on load: the defaults are seeded so entries
  already recorded stay readable.

### Notes

- The PIN is stored as a salted SHA-256 hash and unlocking lasts only until the
  app closes. It keeps a child out of the rules screen; it is not a lock on the
  data, because the hash sits in the same browser storage as the records.
- Tests: 68, up from 29.

## 1.0.0 — 2026-09-02

First working version, deployed at
https://child-finance-manager-lvca.vercel.app

### Added

- A tin per child, each with its own balance.
- Recording money in and money spent, with a category, a note and a date.
- History grouped by day; any entry can be edited or deleted, and the balance
  follows.
- Adding, renaming and removing children.
- Saving and loading a backup file, which is also how records move between
  devices or browsers.
- A currency setting, defaulting to SGD.

### Notes

- Money is held as a whole number of cents, so totals cannot drift.
- A balance is never stored — it is always the sum of the entries behind it.
- Everything lives in one browser on one device. Clearing the browser's site
  data erases it, and there is no login.
