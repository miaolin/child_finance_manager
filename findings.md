# Findings & Decisions

## Requirements
Stated goal: "build a child finance manager app to record how much money they have and how much money they spend."

Confirmed with the user on 2026-09-02:
- **Platform:** local web app running in the browser; no backend server of our own
- **Users:** multiple children, each with a separate balance
- **v1 scope:** core tracking only — money in, money out, categories, notes, dates, running balance, editable history
- **Storage:** local now, cloud later, behind a swappable data-access interface
- **Login:** one parent login; interface now, real auth when the cloud swap happens

Derived requirement: money coming IN must be recordable (allowance, gifts, chore earnings) — a balance cannot grow otherwise, so "how much they have" depends on it.

## Research Findings
- Project is greenfield: only README.md (`# child_finance_manager`) and .git, single commit `7c18ef3 first commit`. No existing stack to conform to.
- Tension resolved: the user picked a browser-only app AND a cloud database. A browser-only app can talk directly to a BaaS (Supabase/Firebase) with no server of ours — but they then chose "local now, cloud later", so v1 uses browser storage behind an interface and the cloud provider decision is deferred to the swap.
- Consequence of browser-only + no server: there is no filesystem access, so the local medium must be browser storage (localStorage/IndexedDB). JSON export/import is required so the data is never trapped in one browser and so the eventual cloud migration has an import path.
- Consequence of local storage + "parent login": a login here is cosmetic, not a security boundary — anyone with the device sees the data. Recorded honestly rather than building a false lock.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Money stored as integer cents | Floating point accumulates rounding errors across many small amounts |
| Balance = SUM(transactions) per child | Prevents a stored balance drifting out of sync with edited or deleted history |
| `FinanceRepo` interface between UI and storage | Delivers the "local now, cloud later" requirement — swap the implementation, UI untouched |
| `LocalRepo` on browser storage for v1 | Only local option available to a serverless browser app |
| Vite + React + TypeScript | Fast dev loop; types catch cents-vs-dollars and wrong-child-id mistakes at compile time |
| `AuthProvider` interface, local parent profile | One-file change to adopt real auth later |
| JSON export/import in v1 | Backup, and the migration path into the cloud database |

## Data Model (draft)
```
Child        id, name, emoji, color, createdAt, archivedAt?
Transaction  id, childId, amountCents (positive int), kind: 'in' | 'out',
             categoryId, note, occurredOn (date), createdAt, updatedAt
Category     id, label, emoji, appliesTo: 'in' | 'out'
Settings     currency, parentProfile

balanceCents(child) = SUM(amountCents where kind='in') - SUM(amountCents where kind='out')
```

## Screens (draft)
1. **Home** — one card per child: name, emoji, current balance. Add-child action.
2. **Child** — large balance, "Got money" / "Spent" buttons, transactions grouped by date.
3. **Transaction editor** — amount entry, category picker (emoji grid), note, date. Same form for add and edit.
4. **Settings** — currency, export/import JSON, manage children.

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| "Browser-only app" + "cloud database" appeared contradictory | Clarified with the user: a browser app can hit a BaaS directly; user then chose local-now-cloud-later, so the interface seam covers both |
| A parent login over local storage is not real security | Building the auth seam, deferring the real gate to the cloud swap; documented rather than faked |

## Resources
- Project root: /Users/kakalin/Documents/Miao_MacBook_Pro/Study/codes/child_finance_manager

## Visual/Browser Findings
Captured from driving the running app at http://localhost:5173 on 2026-09-02.

- Both web fonts load and apply: `document.fonts.check` reported Baloo 2 700 and
  Work Sans 400/500/600 loaded. An early read of a zoomed screenshot suggested
  the display face had fallen back; checking the font set directly disproved it.
- Add -> edit -> delete verified end to end in the real UI. Mia at $11.51, adding
  $12.50 of chore money gave $24.01 with money-in rising $30.00 -> $42.50;
  deleting that entry returned both figures exactly.
- Two children seeded side by side stayed separate: $11.51 and $11.01.
- The bottom-anchored sheet looked wrong on a desktop-width window; it now
  centres above 620px and keeps the bottom-sheet form below that.
- Phone-width layout is unverified: `resize_window` did not change the reported
  viewport (`window.innerWidth` stayed 2370), so the narrow-width rules have not
  been seen rendering.

---
*Update this file after every 2 view/browser/search operations*
