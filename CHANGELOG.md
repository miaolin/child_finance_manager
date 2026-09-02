# Changelog

Notable changes to Pocket money. Newest first.

Versions follow [semantic versioning](https://semver.org): the first number
changes when the way the app is used changes, the second when something is
added, the third for fixes.

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
