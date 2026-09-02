# Task Plan: Child Finance Manager App

## Goal
A browser app where each child has their own balance, money coming in and money spent is recorded with a category and note, and the current total is always correct and visible.

## Current Phase
Phase 6 — Testing & Delivery (in progress)

## Confirmed Requirements (from user, 2026-09-02)
| Question | Answer |
|----------|--------|
| Platform | Local web app in the browser (no server of our own) |
| Users | Multiple children, each with a separate balance |
| v1 scope | Core tracking only (money in, money out, categories, notes, dates, running balance, editable history) |
| Storage | Local now, cloud later — behind a swappable data-access interface |
| Login | One parent login (interface built now, real auth arrives with the cloud swap) |

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm platform, users, scope, storage, auth
- [x] Record answers in findings.md
- **Status:** complete

### Phase 2: Design & Data Model
- [x] Finalize entities: Child, Transaction, Category, Settings
- [x] Define the `FinanceRepo` interface that the whole UI talks to
- [x] Define balance rule: derived by summing transactions, never stored
- [x] Define money rule: integer cents everywhere, formatted only at display
- [x] Sketch the four screens
- **Status:** complete

### Phase 3: Project Scaffold
- [x] Vite + React + TypeScript project
- [x] Folder structure: src/domain, src/data, src/ui
- [x] `LocalRepo` implementation (browser storage) behind `FinanceRepo`
- [x] Seed categories
- [x] 29 unit tests green over money, balance and repo
- [x] Verified `npm run dev` boots and the app renders
- **Status:** complete

### Phase 4: Core Features
- [x] Manage children: add, rename, pick emoji/color, remove
- [x] Home screen: one tin per child showing current balance
- [x] Child screen: big balance + "Got money" / "Spent money" actions
- [x] Add transaction: amount, category, note, date
- [x] Transaction list grouped by date, with edit and delete
- [x] Balance recomputes correctly after every edit/delete
- **Status:** complete

### Phase 5: Polish & Data Safety
- [x] Kid-friendly visual design: tin-and-coin system, chunky ink borders, hard
      offset shadows, Baloo 2 for figures and Work Sans for reading
- [x] Export / import all data as JSON (backup + the migration path to cloud)
- [x] Empty states and input validation (no zero, negative or fractional cents,
      no future-dated entries)
- [ ] Parent gate seam: NOT BUILT — see Deferred
- **Status:** complete apart from the auth seam

### Phase 6: Testing & Delivery
- [ ] Test: add, edit, delete, per-child isolation, balance math
- [ ] Test: cents arithmetic has no rounding drift
- [ ] Test: export -> wipe -> import restores exactly
- [ ] Write README.md run instructions
- **Status:** pending

## v2: Parent view (planned 2026-09-02)

### Goal
A parent decides the rules — what counts as earning, what counts as spending,
what chores pay, what allowance arrives, what a child may spend. The child
records what actually happened within those rules.

Confirmed with the user:

| Question | Answer |
|----------|--------|
| Parent edits categories | Yes — add, rename, re-emoji, remove, for both directions |
| Chores and allowance | Yes — chores with fixed payouts, recurring allowance per child |
| Spending limits | Yes — a cap the child cannot record past |
| Approval queue | **No** — entries count immediately; the parent sets rules, not permissions |
| Separation | A Parent tab behind a 4-digit PIN |

### Phase v2.1: Data model
- [x] Categories move from a hardcoded constant into stored data, seeded with
      today's defaults on first run
- [x] Category delete is a soft archive, so history keeps its real label
- [x] New `Chore` entity: label, emoji, payout
- [x] Per-child allowance: amount, cadence, anchor day, last paid
- [x] Per-child spending limits: per purchase and per week
- [x] Parent PIN in settings, stored as a salted hash
- [x] `normalizeSnapshot` migrates v1 files, which have none of these
- **Status:** complete

### Phase v2.2: Rules as pure functions
- [x] `allowance.ts`: which allowance dates are owed, given the last paid date
- [x] `limits.ts`: does this spend break a limit, and which one
- [x] Both unit-tested before any UI touched them (17 tests)
- **Status:** complete

### Phase v2.3: Parent view behind the PIN
- [x] PIN set on first use, entered thereafter; unlock lives in memory only,
      so closing the app re-locks it
- [x] Manage ways to earn and ways to spend
- [x] Manage chores and their payouts
- [x] Set each child's allowance and limits
- **Status:** complete

### Phase v2.4: What the child sees
- [x] Chore buttons that claim a fixed payout in one tap
- [x] Allowance credited automatically for every date owed since last time
- [x] A blocked spend explains which limit it broke and by how much
- **Status:** complete

### Phase v2.5: Verify
- [x] Tests for migration, allowance dates, limit checks — 65 green, up from 29
- [x] Drove the real app: set a $2.00 per-purchase limit on one child, claimed a
      $3.50 chore in one tap, then had a $5.00 spend blocked with the reason
- **Status:** complete

### Phase v2.6: Forgotten PIN
- [x] "Forgotten the PIN?" on the gate clears it and lets a new one be chosen
- [x] Clearing touches nothing but the PIN — children, entries and rules stay
- [x] Verified: set a PIN, reloaded, reset it, confirmed records untouched
- **Status:** complete

Reasoning: with no reset, forgetting the PIN meant hand-editing a backup file
or clearing site data. A reset is not a weakness here, because the PIN was
never a lock on the data — it only guards the rules screen.

### Honest note on the PIN
Stored in the browser, a PIN stops a young child wandering into the parent tab.
It is not security: anyone who can open devtools can read or clear it. Real
separation still waits on the cloud swap and actual accounts.

## v3: Cloud sync (built 2026-09-02)

### Goal
The same records on every device, and an app that still works with no signal.

Confirmed with the user: Supabase; one family account signed in by magic link;
readable offline with changes queued and uploaded on reconnect.

### Phases
- [x] Schema with row-level security, and setup steps the user runs themselves
- [x] Every entity carries `updatedAt`; deletes became tombstones, because a
      hard delete on one device is undone by the next pull from another
- [x] `merge.ts` — last-write-wins per row, pure and tested first (13 tests)
- [x] `remote.ts` — the one place camelCase meets snake_case
- [x] `SyncingRepo` — reads local always, writes local first, pushes after
- [x] Magic-link sign-in and a status line that says what is *not* uploaded yet
- [x] Verified with no keys (app unchanged) and with keys (panel appears)
- [ ] **Not verified: a real round trip.** Needs the user's Supabase project.
- **Status:** built, awaiting live verification

### Why last-write-wins and not something cleverer
Merging two edits of the same entry needs a rule a parent can predict. "The
most recent change wins" is explainable in one sentence. A proper CRDT would
avoid losing the older edit, at a cost in complexity far past what a family
ledger justifies.

## v3.1: Sync redo — sign-in that actually works (2026-09-02)

### Why
Sync has never carried data between two devices, across four attempts. Verified
from the computer's own storage: no session, never synced. The engine is fine;
the **magic link** is the fault. A link must be opened in the browser that asked
for it, and the mail client keeps handing it to the default browser instead.

Studied github.com/miaolin/Olivia_study_plan, which syncs reliably across the
same user's devices. Its SETUP.md says, of Firebase auth: "leave passwordless
off". Email and password works in whatever browser you type it into.

### Decided with the user
Keep Supabase and everything already verified. Replace magic link with email +
password, and add Supabase Realtime so a change on one device appears on the
other without pressing anything.

### Phases
- [x] v3.1.1 Auth: email + password, sign in and create account, real errors
- [x] v3.1.2 Realtime: subscribe per table, pull on remote change
- [x] v3.1.3 Schema: add the tables to the realtime publication
- [x] v3.1.4 Docs: revised setup, including turning off email confirmation
- [x] v3.1.5 Verified on two real devices — 2026-09-02, after five attempts
- **Status:** complete

### Verified
Queried the database from the signed-in browser: 1 child, 2 transactions
(+$100.00 and +$40.00 = the $140 that had been stranded on the computer since
this began), 14 categories. Both devices signed in as the same account and
showing the same records.

### What actually fixed it
Two faults, stacked, each hiding the next:
1. **Magic link.** Had to be opened in the browser that asked for it; the mail
   app handed it to the default browser instead. Replaced with a password.
2. **A token for a deleted user.** Supabase tokens are signed, not checked
   against the database, so deleting the old account left a device writing rows
   keyed to a user id that no longer existed. Now detected and signed out.

Neither was in the sync engine, which was correct from the start. The lesson is
that the sign-in path deserved the same scrutiny as the merge logic — it was
the part a person actually had to get right, and it was the part with no
diagnostics at all.

### Migration note
The existing account was created by magic link and has no password. The cloud
holds nothing worth keeping (verified empty), so the clean path is to delete
that user in the Supabase dashboard and create a fresh one with a password.

### Kept from the old approach
Per-record sync with `updatedAt` and tombstones. The reference app syncs a whole
document and had to hand-write reconciliation twice to stop one device wiping
another's field. Per-record does not have that failure.

## Deferred (explicitly out of v1)
- `AuthProvider` seam and parent login. Over local storage a login is not a
  security boundary, so it was left out rather than faked. It belongs with the
  cloud swap, where it becomes real.
- Savings goals with progress bars
- Spending reports and charts
- Recurring allowance / chore automation
- Real cloud sync and per-child logins

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Balance derived from transactions, never stored | A stored balance drifts out of sync as soon as a transaction is edited or deleted |
| Money stored as integer cents | Floating point accumulates rounding errors across many small amounts |
| All data access behind a `FinanceRepo` interface | The chosen "local now, cloud later" path — swap the implementation, the UI never changes |
| Browser storage as the local medium | A browser-only app with no server of ours has no filesystem access; JSON export/import keeps data portable |
| Vite + React + TypeScript | Fast dev server, types catch money/ID mistakes, standard and easy to hand off |
| Auth interface built now, login deferred | Local storage makes a login cosmetic, not a security boundary; the seam means adding real auth later touches one file |

## Open Assumptions (say the word to change)
- Currency defaults to USD, exposed as a setting
- UI language: English

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- Update phase status as you progress: pending -> in_progress -> complete
- Re-read this plan before major decisions
- Log ALL errors
