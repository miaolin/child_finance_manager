# Progress Log

## Session: 2026-09-02

### Phase 1: Requirements & Discovery
- **Status:** complete
- Actions taken:
  - Session-catchup check: no prior state. Project was a greenfield repo.
  - Asked six scoping questions over two rounds; all answered.
  - Resolved the browser-only vs cloud-database tension into a repository seam.
- Files created/modified: task_plan.md, findings.md, progress.md (created)

### Phase 2: Design & Data Model
- **Status:** complete
- Actions taken:
  - Settled entities, the FinanceRepo contract, the derived-balance rule and the
    integer-cent rule before writing any UI.
- Files created/modified: findings.md, task_plan.md

### Phase 3: Project Scaffold
- **Status:** complete
- Actions taken:
  - Scaffolded Vite + React 19 + TypeScript in a temp dir and copied the config
    in, so the installer never prompted about the non-empty repo.
  - Added vitest. Wrote domain/ and data/ layers.
- Files created/modified: package.json, tsconfig*.json, vite.config.ts,
  index.html, src/domain/*, src/data/*

### Phase 4: Core Features
- **Status:** complete
- Actions taken:
  - Built the four screens, the two sheets, the shared components and the
    useFinance hook.
  - Loaded the frontend-design guidance and worked to a tin-and-coin visual
    system rather than a default card layout.
- Files created/modified: src/App.tsx, src/main.tsx, src/index.css, src/app.css,
  src/ui/*, public/coin.svg

### Phase 5: Polish & Data Safety
- **Status:** complete apart from the deferred auth seam
- Actions taken:
  - JSON export/import, currency setting, delete confirmation for a child,
    empty states, validation messages.
- Files created/modified: src/ui/SettingsSheet.tsx, src/ui/ChildSheet.tsx

### Phase 6: Testing & Delivery
- **Status:** complete
- Actions taken:
  - 29 unit tests green.
  - Drove the real app in the browser: added a child, added money, edited an
    entry, deleted it, and confirmed the balance was right at each step.
  - Cleared the seeded test data from browser storage afterwards.
  - Wrote README.md.
- Files created/modified: README.md, planning files

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Unit suite | `npm test` | all green | 29 passed across 3 files | pass |
| Typecheck + build | `npm run build` | clean | clean, 209 kB js / 9.3 kB css | pass |
| Add a child | name "Mia", fox, yellow | tin appears at $0.00 | as expected | pass |
| Add money in browser | $12.50, Chores | balance $11.51 -> $24.01 | as expected | pass |
| Money-in total | same | $30.00 -> $42.50 | as expected | pass |
| Edit prefill | open the $12.50 entry | amount, category, date prefilled | as expected | pass |
| Delete in browser | delete that entry | balance back to $11.51 | as expected | pass |
| Per-child isolation | Mia and Leo seeded | $11.51 and $11.01, kept apart | as expected | pass |
| Fonts | page load | Baloo 2 + Work Sans active | both loaded | pass |
| Phone-width layout | resize to 420px | single-column | NOT VERIFIED — the extension kept the viewport at 2370px | untested |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-09-02 10:38 | TS1294: parameter properties not allowed under `erasableSyntaxOnly` | 1 | Declared `store` as an explicit field and assigned it in the constructor |
| 2026-09-02 10:40 | Typing in a sheet went nowhere | 1 | `Sheet` focused its panel in an effect, stealing focus from the autofocused input. Now it only takes focus if nothing inside already has it |

## Design notes (for a future pass)
- The balance panel first carried a small centred "coin slot"; at real size it
  read as a stray dash and was the only place a child's colour appeared on that
  screen. Replaced with a full-width coloured lid band matching the home tin,
  which fixed both at once.
- "Edit this money in" was awkward; now "Edit money in" / "Edit spending".

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | v1 complete and verified in the browser |
| Where am I going? | Deferred: auth seam, savings goals, reports, allowance automation, cloud swap |
| What's the goal? | Browser app: per-child balances, money in and money spent |
| What have I learned? | See findings.md |
| What have I done? | All six phases; see per-phase logs above |

---
*Update after completing each phase or encountering errors*

## Session: 2026-09-02 (later) — sync redo

### Why
Cloud sync had never carried data between two devices. Probed the computer's
own browser storage directly: no session, never synced. The engine was fine;
sign-in was the failure.

### Research
Read `cloud.js`, `firebase-config.js`, `auth-ui.js` and `SETUP.md` in
github.com/miaolin/Olivia_study_plan. It syncs reliably and uses **email +
password** — its setup explicitly says "leave passwordless off". See findings.md.

### Done
- Replaced magic link with email + password sign-in, with errors written for a
  parent rather than a developer
- Added Supabase Realtime so a change on one device reaches the others on its own
- Added the tables to the realtime publication in schema.sql
- Rewrote the setup steps; confirmation email now off, with the trade explained

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Unit suite | green | 81 passed | pass |
| Typecheck + build | clean | clean | pass |
| Sign-in UI renders | email + password + two buttons | as expected | pass |
| Two real devices sharing records | records appear on both | **not yet — needs the user** | pending |
