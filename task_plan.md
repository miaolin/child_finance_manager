# Task Plan: Child Finance Manager App

## Goal
A browser app where each child has their own balance, money coming in and money spent is recorded with a category and note, and the current total is always correct and visible.

## Current Phase
Phase 4 — Core Features (in progress)

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
- [ ] Verify `npm run dev` boots (after UI exists)
- **Status:** in_progress

### Phase 4: Core Features
- [ ] Manage children: add, rename, pick emoji/color, remove
- [ ] Home screen: one card per child showing current balance
- [ ] Child screen: big balance + "Got money" / "Spent" actions
- [ ] Add transaction: amount, category, note, date
- [ ] Transaction list grouped by date, with edit and delete
- [ ] Balance recomputes correctly after every edit/delete
- **Status:** pending

### Phase 5: Polish & Data Safety
- [ ] Kid-friendly visual design (large numbers, emoji categories, clear +/- colors)
- [ ] Export / import all data as JSON (backup + the migration path to cloud)
- [ ] Parent gate seam: `AuthProvider` interface, local single-parent profile for now
- [ ] Empty states and input validation (no negative or zero amounts, no future-dated typos)
- **Status:** pending

### Phase 6: Testing & Delivery
- [ ] Test: add, edit, delete, per-child isolation, balance math
- [ ] Test: cents arithmetic has no rounding drift
- [ ] Test: export -> wipe -> import restores exactly
- [ ] Write README.md run instructions
- **Status:** pending

## Deferred (explicitly out of v1)
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
