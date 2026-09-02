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
- [ ] Categories move from a hardcoded constant into stored data, seeded with
      today's defaults on first run
- [ ] Category delete is a soft archive, so history keeps its real label
- [ ] New `Chore` entity: label, emoji, payout
- [ ] Per-child allowance: amount, cadence, anchor day, last paid
- [ ] Per-child spending limits: per purchase and per week
- [ ] Parent PIN in settings, stored as a salted hash
- [ ] `normalizeSnapshot` migrates v1 files, which have none of these
- **Status:** pending

### Phase v2.2: Rules as pure functions
- [ ] `allowance.ts`: which allowance dates are owed, given the last paid date
- [ ] `limits.ts`: does this spend break a limit, and which one
- [ ] Both fully unit-tested before any UI touches them
- **Status:** pending

### Phase v2.3: Parent view behind the PIN
- [ ] PIN set on first use, entered thereafter; unlock lives in memory only,
      so closing the app re-locks it
- [ ] Manage ways to earn and ways to spend
- [ ] Manage chores and their payouts
- [ ] Set each child's allowance and limits
- **Status:** pending

### Phase v2.4: What the child sees
- [ ] Chore buttons that claim a fixed payout in one tap
- [ ] Allowance credited automatically for every date owed since last time
- [ ] A blocked spend explains which limit it broke and by how much
- **Status:** pending

### Phase v2.5: Verify
- [ ] Tests for migration, allowance dates, limit checks
- [ ] Drive the real app: set a rule as parent, then hit it as a child
- **Status:** pending

### Honest note on the PIN
Stored in the browser, a PIN stops a young child wandering into the parent tab.
It is not security: anyone who can open devtools can read or clear it. Real
separation still waits on the cloud swap and actual accounts.

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
